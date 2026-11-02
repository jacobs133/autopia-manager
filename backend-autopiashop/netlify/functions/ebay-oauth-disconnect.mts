import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getCorsHeaders,
  getSupabaseAdminClient,
  authenticateApprovedSeller,
  AuthenticationError,
  ForbiddenError,
  DatabaseError,
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

    // 1. Verifica autenticazione e autorizzazione demolitore (Zero-Trust)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { seller } = await authenticateApprovedSeller(authHeader);

    // 2. Disconnessione locale: invalidazione dello stato e azzeramento immediato dei token nel DB
    // Sia l'access token sia il refresh token vengono impostati a NULL per renderli totalmente inutilizzabili
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('seller_ebay_tokens')
      .update({
        is_active: false,
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        disconnected_at: nowIso,
        updated_at: nowIso,
      })
      .eq('seller_id', seller.id)
      .eq('environment', 'sandbox');

    if (updateError) {
      console.error('[ebay-oauth-disconnect] Errore aggiornamento database:', updateError.message);
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
          'Account eBay scollegato localmente con successo. I token salvati sono stati eliminati dal database di Autopia. Si ricorda che questa operazione disconnette l\'account dal gestionale: per revocare l\'autorizzazione applicativa concessa sui sistemi eBay, è possibile gestire i permessi nella sezione "Accesso di terze parti" delle impostazioni del proprio account eBay.',
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
    console.error('[ebay-oauth-disconnect] Errore imprevisto:', message);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
