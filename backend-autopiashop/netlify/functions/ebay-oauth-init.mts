import crypto from 'node:crypto';
import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getCorsHeaders,
  getRequiredEnvVars,
  getSupabaseAdminClient,
  authenticateApprovedSeller,
  EBAY_SANDBOX_AUTH_URL,
  EBAY_SANDBOX_SCOPES,
  AuthenticationError,
  ForbiddenError,
  DatabaseError,
} from './ebay-shared.mts';

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  // Gestione pre-flight OPTIONS per CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Metodo HTTP non consentito. Utilizzare POST.' }),
    };
  }

  try {
    let envVars;
    try {
      envVars = getRequiredEnvVars();
    } catch (envErr: unknown) {
      const msg = envErr instanceof Error ? envErr.message : 'Variabili d\'ambiente mancanti';
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `${msg}. Configura queste variabili nel pannello Netlify di autopiashop.it.`,
        }),
      };
    }

    const { ebayClientId, ebayRuName } = envVars;
    const supabase = getSupabaseAdminClient();

    // 1. Verifica rigorosa dell'autenticazione del demolitore (Zero-Trust)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let requestedSellerId: string | undefined;
    if (event.body) {
      try {
        const parsed = JSON.parse(event.body);
        requestedSellerId = parsed.seller_id || parsed.sellerId;
      } catch {
        // Ignora parse error se non json
      }
    }
    if (!requestedSellerId && event.queryStringParameters) {
      requestedSellerId = event.queryStringParameters.seller_id || event.queryStringParameters.sellerId;
    }
    const { user, seller } = await authenticateApprovedSeller(authHeader, requestedSellerId);

    // 2. Generazione del parametro state crittograficamente sicuro (256-bit CSPRNG)
    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minuti di validità

    // 3. Persistenza dello state associato atomicamente al demolitore autenticato
    const { error: insertError } = await supabase.from('ebay_oauth_states').insert({
      state_token: stateToken,
      seller_id: seller.id,
      user_id: user.id,
      environment: 'sandbox',
      is_used: false,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[ebay-oauth-init] Errore salvataggio state:', insertError.message);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `Impossibile registrare la sessione temporanea nel database: ${insertError.message}. Assicurati di aver eseguito 'backend-autopiashop/schema.sql' nel SQL Editor di Supabase.`,
        }),
      };
    }

    // 4. Costruzione dell'URL ufficiale di autorizzazione eBay Sandbox
    // REQUISITO TASSATIVO: redirect_uri deve contenere la stringa letterale del RuName registrato su eBay
    const authUrlParams = new URLSearchParams({
      client_id: ebayClientId,
      response_type: 'code',
      redirect_uri: ebayRuName,
      scope: EBAY_SANDBOX_SCOPES,
      state: stateToken,
      prompt: 'login',
    });

    const authorizationUrl = `${EBAY_SANDBOX_AUTH_URL}?${authUrlParams.toString()}`;

    // 5. Restituzione dell'URL di autorizzazione al client desktop (nessun segreto esposto)
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        authorizationUrl,
        authorization_url: authorizationUrl,
        auth_url: authorizationUrl,
        authUrl: authorizationUrl,
        url: authorizationUrl,
        state: stateToken,
        environment: 'sandbox',
        sellerId: seller.id,
        businessName: seller.business_name,
        expiresAt,
      }),
    };
  } catch (err: unknown) {
    if (err instanceof AuthenticationError || err instanceof ForbiddenError) {
      return {
        statusCode: err.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      };
    }

    if (err instanceof DatabaseError) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      };
    }

    const message = err instanceof Error ? err.message : 'Errore interno del server';
    console.error('[ebay-oauth-init] Errore imprevisto:', message);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
