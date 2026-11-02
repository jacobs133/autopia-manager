import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getRequiredEnvVars,
  getSupabaseAdminClient,
  encryptToken,
  escapeHtml,
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
        console.warn('[ebay-oauth-callback] Impossibile marcare state come annullato:', e instanceof Error ? e.message : 'errore');
      }
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: false,
        title: 'Autorizzazione eBay Annullata o Rifiutata',
        message:
          errorDescription ||
          'La richiesta di autorizzazione è stata interrotta o rifiutata sul portale eBay Sandbox.',
        hint: 'Puoi chiudere questa finestra del browser e riprovare la procedura direttamente da Autopia Manager quando desideri.',
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
        hint: 'Torna in Autopia Manager e avvia la procedura dal pulsante "Collega account eBay (Sandbox)".',
      }),
    };
  }

  try {
    const { ebayClientId, ebayClientSecret, ebayRuName, encryptionKeyHex } = getRequiredEnvVars();
    const supabase = getSupabaseAdminClient();

    // 3. Consumo atomico dello state anti-CSRF con verifica di scadenza e unicità
    // L'aggiornamento imposta is_used = true ed estrae i dati solo se lo state è valido, non usato e non scaduto
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
      console.warn('[ebay-oauth-callback] Rifiutato state non valido, già utilizzato o scaduto.');
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
    // Autenticazione HTTP Basic (Client ID : Client Secret)
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
      console.error('[ebay-oauth-callback] Errore risposta da eBay token endpoint (HTTP status):', tokenResponse.status);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderHtmlPage({
          success: false,
          title: 'Scambio Token con eBay Fallito',
          message: `Il server eBay Sandbox ha restituito un errore di comunicazione (HTTP ${tokenResponse.status}).`,
          hint: 'Verifica che il RuName e le credenziali Sandbox configurate su Netlify corrispondano a quelle del Developer Portal eBay.',
        }),
      };
    }

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;
    const refreshToken = tokenJson.refresh_token;
    const expiresIn = tokenJson.expires_in || 7200; // ~2 ore
    const refreshTokenExpiresIn = tokenJson.refresh_token_expires_in || 47304000; // ~18 mesi

    if (!refreshToken) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderHtmlPage({
          success: false,
          title: 'Token di Refresh Mancante',
          message: 'Il server eBay non ha restituito il token di refresh necessario per la sincronizzazione.',
          hint: 'Assicurati di aver concesso i consensi richiesti durante la fase di accesso su eBay.',
        }),
      };
    }

    // 5. Interrogazione Identity API per recuperare lo username reale di test
    let ebayUsername: string | null = null;
    let ebayUserId: string | null = null;

    if (accessToken) {
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
          console.warn('[ebay-oauth-callback] Identity API ha risposto con status non-200:', identityRes.status);
        }
      } catch (identityErr) {
        console.warn(
          '[ebay-oauth-callback] Impossibile recuperare dettagli profilo da Identity API:',
          identityErr instanceof Error ? identityErr.message : 'errore'
        );
      }
    }

    // 6. Cifratura a riposo AES-256-GCM con validazione a 32 byte prima della scrittura nel DB
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
      console.error('[ebay-oauth-callback] Errore salvataggio credenziali nel DB:', upsertError.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderHtmlPage({
          success: false,
          title: 'Errore Salvataggio Credenziali',
          message: 'I token sono stati emessi da eBay ma non è stato possibile salvarli nel database del gestionale.',
          hint: 'Controlla che la tabella seller_ebay_tokens esista e sia accessibile alla Service Role Key di Supabase.',
        }),
      };
    }

    // 8. Visualizzazione pagina di conferma successo protetta da XSS
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: true,
        title: 'Account eBay Sandbox Collegato!',
        message: `L'account eBay ${
          ebayUsername ? `"${ebayUsername}"` : 'Sandbox'
        } è stato associato con successo al tuo profilo autodemolitore in Autopia Manager.`,
        hint: 'Puoi chiudere questa scheda del browser. Tornando nell\'applicazione desktop Autopia Manager, clicca su "Aggiorna Stato" (oppure attendi la verifica automatica) per visualizzare lo stato "COLLEGATO (SANDBOX)".',
      }),
    };
  } catch (err: unknown) {
    console.error('[ebay-oauth-callback] Eccezione callback:', err instanceof Error ? err.message : 'errore');

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderHtmlPage({
        success: false,
        title: 'Errore Interno del Server',
        message: 'Si è verificato un errore imprevisto durante l\'elaborazione del callback OAuth.',
        hint: 'Torna in Autopia Manager e riprova la procedura di collegamento.',
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

/**
 * Genera la pagina HTML protetta contro XSS applicando escapeHtml a tutti i campi dinamici.
 * Non mostra token, password o chiavi private.
 */
function renderHtmlPage({ success, title, message, hint }: HtmlTemplateParams): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeHint = escapeHtml(hint);

  const primaryColor = success ? '#10b981' : '#f59e0b';
  const bgColor = '#090d16';
  const cardBg = '#0f172a';
  const borderColor = success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Autopia Manager</title>
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
    <h1>${safeTitle}</h1>
    <p class="description">${safeMessage}</p>
    <div class="hint-box">${safeHint}</div>
    <div class="brand">Autopia Manager • Piattaforma Gestionale Autodemolizioni</div>
  </div>
</body>
</html>`;
}
