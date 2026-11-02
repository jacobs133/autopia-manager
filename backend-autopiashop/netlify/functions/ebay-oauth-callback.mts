import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getRequiredEnvVars,
  getSupabaseAdminClient,
  encryptToken,
  EBAY_SANDBOX_TOKEN_URL,
  EBAY_SANDBOX_IDENTITY_URL,
} from './ebay-shared.mts';

export const handler: Handler = async (event: HandlerEvent) => {
  const query = event.queryStringParameters || {};
  const code = query.code;
  const state = query.state;
  const oauthError = query.error;
  const errorDescription = query.error_description;

  // 1. Gestione del rifiuto esplicito o dell'errore restituito da eBay
  if (oauthError) {
    if (state) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase
          .from('ebay_oauth_states')
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq('state_token', state);
      } catch (e) {
        console.warn('[ebay-oauth-callback] Impossibile marcare state come annullato:', e);
      }
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: false,
        title: 'Autorizzazione eBay Annullata',
        message:
          errorDescription ||
          'La richiesta di autorizzazione è stata interrotta o rifiutata sul portale eBay Sandbox.',
        hint: 'Puoi chiudere questa finestra del browser e riprovare il collegamento direttamente da Autopia Manager.',
      }),
    };
  }

  // 2. Controllo dei parametri minimi attesi
  if (!code || !state) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: false,
        title: 'Parametri Callback Mancanti',
        message: 'La richiesta ricevuta da eBay non include il codice di autorizzazione o il parametro state.',
        hint: 'Avvia nuovamente la procedura dall\'applicazione gestionale desktop.',
      }),
    };
  }

  try {
    const { ebayClientId, ebayClientSecret, ebayRuName, encryptionKeyHex } = getRequiredEnvVars();
    const supabase = getSupabaseAdminClient();

    // 3. Consumo atomico dello state anti-CSRF con verifica di scadenza e unicità
    // La query aggiorna is_used = true ed estrae seller_id solo se lo state è valido, non ancora usato e non scaduto
    const nowIso = new Date().toISOString();
    const { data: stateData, error: stateError } = await supabase
      .from('ebay_oauth_states')
      .update({ is_used: true, used_at: nowIso })
      .eq('state_token', state)
      .eq('is_used', false)
      .gt('expires_at', nowIso)
      .select('seller_id, user_id, environment')
      .maybeSingle();

    if (stateError || !stateData) {
      console.warn('[ebay-oauth-callback] Rifiutato state non valido, già utilizzato o scaduto:', state);
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderHtmlPage({
          success: false,
          title: 'Sessione OAuth Non Valida o Scaduta',
          message:
            'Il parametro di sicurezza (state) è scaduto, è già stato utilizzato o non appartiene a una sessione autorizzata da Autopia Manager.',
          hint: 'Per motivi di sicurezza anti-CSRF, torna nel gestionale desktop e clicca nuovamente su "Collega account eBay (Sandbox)".',
        }),
      };
    }

    const { seller_id, environment } = stateData;

    // 4. Scambio del codice di autorizzazione con i token di accesso e di refresh
    // Autenticazione HTTP Basic (Client ID:Client Secret)
    const basicAuth = Buffer.from(`${ebayClientId}:${ebayClientSecret}`).toString('base64');

    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: ebayRuName, // TASSATIVO: il RuName letterale di eBay
    });

    const tokenResponse = await fetch(EBAY_SANDBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json',
      },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errPayload = await tokenResponse.text();
      console.error('[ebay-oauth-callback] Errore risposta da eBay token endpoint:', errPayload);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderHtmlPage({
          success: false,
          title: 'Scambio Token con eBay Fallito',
          message: `Il server eBay Sandbox ha restituito un errore HTTP ${tokenResponse.status}.`,
          hint: 'Verifica la corrispondenza del RuName e delle credenziali Sandbox nel Developer Portal.',
        }),
      };
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;
    const refreshToken = tokenJson.refresh_token;
    const expiresIn = tokenJson.expires_in || 7200; // ~2 ore
    const refreshTokenExpiresIn = tokenJson.refresh_token_expires_in || 47304000; // ~18 mesi

    if (!refreshToken) {
      throw new Error('eBay non ha restituito il refresh token atteso.');
    }

    // 5. Interrogazione di verifica dell'identità dell'account eBay (Identity API)
    let ebayUsername: string | null = null;
    let ebayUserId: string | null = null;

    try {
      const identityRes = await fetch(EBAY_SANDBOX_IDENTITY_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (identityRes.ok) {
        const identityData = await identityRes.json();
        ebayUsername = identityData.username || identityData.userId || null;
        ebayUserId = identityData.userId || null;
      } else {
        console.warn(
          '[ebay-oauth-callback] Identity API ha risposto con status:',
          identityRes.status
        );
      }
    } catch (identityErr) {
      console.warn('[ebay-oauth-callback] Impossibile recuperare dettagli profilo da Identity API:', identityErr);
    }

    // 6. Cifratura a riposo AES-256-GCM dei token prima della memorizzazione sul database
    const encryptedRefreshToken = encryptToken(refreshToken, encryptionKeyHex);
    const encryptedAccessToken = accessToken ? encryptToken(accessToken, encryptionKeyHex) : null;

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000).toISOString();

    // 7. Persistenza sicura nella tabella seller_ebay_tokens (protetta da RLS per il solo service_role)
    const { error: upsertError } = await supabase.from('seller_ebay_tokens').upsert(
      {
        seller_id: seller_id,
        environment: environment || 'sandbox',
        ebay_username: ebayUsername || 'Utente Sandbox',
        ebay_user_id: ebayUserId,
        access_token_encrypted: encryptedAccessToken,
        access_token_expires_at: tokenExpiresAt,
        refresh_token_encrypted: encryptedRefreshToken,
        refresh_token_expires_at: refreshTokenExpiresAt,
        scopes: [
          'https://api.ebay.com/oauth/api_scope',
          'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
        ],
        is_active: true,
        disconnected_at: null,
        updated_at: nowIso,
      },
      { onConflict: 'seller_id,environment' }
    );

    if (upsertError) {
      console.error('[ebay-oauth-callback] Errore salvataggio credenziali cifrate nel DB:', upsertError);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderHtmlPage({
          success: false,
          title: 'Errore Salvataggio Credenziali',
          message: 'I token sono stati emessi da eBay ma non è stato possibile salvarli nel database Supabase.',
          hint: 'Controlla che la tabella seller_ebay_tokens esista e sia accessibile alla Service Role Key.',
        }),
      };
    }

    // 8. Visualizzazione pagina di conferma successo
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: true,
        title: 'Account eBay Sandbox Collegato!',
        message: `L'account eBay ${
          ebayUsername ? `"${ebayUsername}"` : 'Sandbox'
        } è stato associato con successo al tuo profilo autodemolitore in Autopia Manager.`,
        hint: 'Puoi chiudere questa scheda del browser. Tornando nell\'applicazione desktop, lo stato del canale eBay si aggiornerà automaticamente su "COLLEGATO (SANDBOX)".',
      }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore imprevisto durante il callback OAuth';
    console.error('[ebay-oauth-callback] Eccezione callback:', err);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: false,
        title: 'Errore Interno del Server',
        message: message,
        hint: 'Riprova la procedura o verifica i log della Netlify Function.',
      }),
    };
  }
};

interface HtmlTemplateParams {
  success: boolean;
  title: string;
  message: string;
  hint: string;
}

function renderHtmlPage({ success, title, message, hint }: HtmlTemplateParams): string {
  const primaryColor = success ? '#10b981' : '#f59e0b';
  const bgColor = '#090d16';
  const cardBg = '#0f172a';
  const borderColor = success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Autopia Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${bgColor};
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background-color: ${cardBg};
      border: 1px solid ${borderColor};
      border-radius: 1rem;
      max-width: 540px;
      width: 100%;
      padding: 2.25rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
      background: ${success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
      color: ${primaryColor};
      border: 1px solid ${borderColor};
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
      color: #ffffff;
    }
    p.description {
      font-size: 0.95rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }
    .hint-box {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 0.5rem;
      padding: 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.45;
      margin-bottom: 1.75rem;
    }
    .brand {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${success ? 'Connessione Riuscita' : 'Attenzione'}</div>
    <h1>${title}</h1>
    <p class="description">${message}</p>
    <div class="hint-box">${hint}</div>
    <div class="brand">Autopia Manager • Piattaforma Gestionale Autodemolizioni</div>
  </div>
</body>
</html>`;
}
