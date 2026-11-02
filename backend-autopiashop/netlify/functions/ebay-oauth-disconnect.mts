import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getCorsHeaders,
  getSupabaseAdminClient,
  authenticateApprovedSeller,
  AuthenticationError,
  ForbiddenError,
} from './ebay-shared.mts';

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Metodo HTTP non consentito. Utilizzare POST.' }),
    };
  }

  try {
    const supabase = getSupabaseAdminClient();

    // 1. Verifica autenticazione e autorizzazione demolitore
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { seller } = await authenticateApprovedSeller(authHeader);

    // 2. Disconnessione locale: invalidazione dello stato e rimozione immediata dei token salvati
    // I token vengono cancellati (azzerati) dal database per impedirne qualsiasi utilizzo futuro da Autopia Manager
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('seller_ebay_tokens')
      .update({
        is_active: false,
        access_token_encrypted: null,
        refresh_token_encrypted: '[REVOCATO_LOCALMENTE]',
        disconnected_at: nowIso,
        updated_at: nowIso,
      })
      .eq('seller_id', seller.id)
      .eq('environment', 'sandbox');

    if (updateError) {
      console.error('[ebay-oauth-disconnect] Errore aggiornamento record nel database:', updateError);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Errore durante la disconnessione nel database.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message:
          'Account eBay scollegato localmente con successo. I token di accesso sono stati eliminati da Autopia. Per revocare definitivamente l\'autorizzazione applicativa remota su eBay, l\'utente può accedere alla sezione "Accesso di terze parti" nelle impostazioni del proprio account eBay.',
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

    const message = err instanceof Error ? err.message : 'Errore interno del server';
    console.error('[ebay-oauth-disconnect] Errore imprevisto:', err);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
