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

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Metodo HTTP non consentito. Utilizzare GET o POST.' }),
    };
  }

  const antiCacheHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    const supabase = getSupabaseAdminClient();

    // 1. Verifica autenticazione e seller_profile approvato (Zero-Trust)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { seller } = await authenticateApprovedSeller(authHeader);

    // 2. Lettura dello stato di connessione per il demolitore autenticato (Isolamento Totale)
    // Non vengono MAI selezionate le colonne contenenti i token cifrati
    // Usiamo order('updated_at', { ascending: false }).limit(1) per evitare errori PGRST116 se esistono più record storici
    const querySellerId = event.queryStringParameters?.seller_id || event.queryStringParameters?.sellerId;
    const targetSellerId = (querySellerId && querySellerId.trim() === seller.id) ? seller.id : seller.id;

    const { data: tokenRows, error: tokenError } = await supabase
      .from('seller_ebay_tokens')
      .select('id, ebay_username, is_active, refresh_token_expires_at, scopes, created_at, updated_at')
      .eq('seller_id', targetSellerId)
      .ilike('environment', 'sandbox')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (tokenError) {
      console.error('[ebay-oauth-status] Errore lettura DB:', tokenError.message);
      return {
        statusCode: 500,
        headers: antiCacheHeaders,
        body: JSON.stringify({ error: 'Errore durante la lettura dello stato dal database.' }),
      };
    }

    const tokenRow = tokenRows && tokenRows.length > 0 ? tokenRows[0] : null;
    const isConnected = Boolean(tokenRow && tokenRow.is_active);

    // 3. Risposta sicura verso il desktop: nessun token o segreto viene mai restituito
    return {
      statusCode: 200,
      headers: antiCacheHeaders,
      body: JSON.stringify({
        isConnected,
        environment: 'sandbox',
        sellerId: seller.id,
        businessName: seller.business_name,
        ebayUsername: isConnected ? tokenRow?.ebay_username || 'Utente Sandbox' : null,
        connectedAt: isConnected ? tokenRow?.created_at || null : null,
        tokenExpiresAt: isConnected ? tokenRow?.refresh_token_expires_at || null : null,
        scopes: isConnected && Array.isArray(tokenRow?.scopes) ? tokenRow.scopes : [],
        message: isConnected
          ? 'Account eBay collegato regolarmente'
          : 'Nessun account eBay Sandbox collegato',
      }),
    };
  } catch (err: unknown) {
    if (err instanceof AuthenticationError || err instanceof ForbiddenError) {
      return {
        statusCode: err.statusCode,
        headers: antiCacheHeaders,
        body: JSON.stringify({ error: err.message }),
      };
    }

    if (err instanceof DatabaseError) {
      return {
        statusCode: 500,
        headers: antiCacheHeaders,
        body: JSON.stringify({ error: err.message }),
      };
    }

    const message = err instanceof Error ? err.message : 'Errore interno del server';
    console.error('[ebay-oauth-status] Errore imprevisto:', message);

    return {
      statusCode: 500,
      headers: antiCacheHeaders,
      body: JSON.stringify({ error: message }),
    };
  }
};
