import { getSupabaseClient } from './supabaseClient';
import type { EbayConnectionInfo, EbayOAuthInitResult } from '../types/ebay';

export const DEFAULT_EBAY_OAUTH_BACKEND_URL = 'https://autopiashop.it/.netlify/functions';

/**
 * Restituisce l'URL di base del backend serverless che gestisce il flusso OAuth di eBay.
 * Può essere sovrascritto tramite la variabile d'ambiente VITE_EBAY_OAUTH_BACKEND_URL.
 */
export function getEbayOAuthBackendBaseUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_EBAY_OAUTH_BACKEND_URL) ||
    (typeof process !== 'undefined' && process?.env?.VITE_EBAY_OAUTH_BACKEND_URL);

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return DEFAULT_EBAY_OAUTH_BACKEND_URL;
}

/**
 * Interroga in modo sicuro il backend Netlify per conoscere lo stato di connessione
 * dell'account eBay Sandbox per il demolitore autenticato.
 * Non riceve mai token in chiaro: restituisce unicamente informazioni di stato e username.
 */
export async function fetchEbayConnectionStatus(sellerId?: string | null): Promise<EbayConnectionInfo> {
  const client = getSupabaseClient();
  const nowIso = new Date().toISOString();

  if (!client) {
    return {
      isConnected: false,
      environment: 'sandbox',
      ebayUsername: null,
      connectedAt: null,
      tokenExpiresAt: null,
      scopes: [],
      lastCheckedAt: nowIso,
      status: 'backend_not_configured',
      message: 'Client Supabase non inizializzato o credenziali mancanti.',
    };
  }

  // Recupera il token JWT di sessione per autenticare la chiamata verso il backend Netlify
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return {
      isConnected: false,
      environment: 'sandbox',
      ebayUsername: null,
      connectedAt: null,
      tokenExpiresAt: null,
      scopes: [],
      lastCheckedAt: nowIso,
      status: 'not_connected',
      message: 'Nessuna sessione utente attiva. Effettua il login per verificare il canale eBay.',
    };
  }

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-oauth-status`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Se l'endpoint non è ancora deployato su Netlify (404/502/503)
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return {
        isConnected: false,
        environment: 'sandbox',
        ebayUsername: null,
        connectedAt: null,
        tokenExpiresAt: null,
        scopes: [],
        lastCheckedAt: nowIso,
        status: 'backend_not_configured',
        message: `Endpoint Netlify Function non ancora distribuito (${res.status}) su ${endpoint}. In attesa del rilascio della funzione server-side nel sito web.`,
      };
    }

    if (res.status === 401 || res.status === 403) {
      const errData = await res.json().catch(() => null);
      return {
        isConnected: false,
        environment: 'sandbox',
        ebayUsername: null,
        connectedAt: null,
        tokenExpiresAt: null,
        scopes: [],
        lastCheckedAt: nowIso,
        status: 'error',
        message: errData?.error || 'Sessione rifiutata dal server backend o profilo autodemolitore non approvato.',
      };
    }

    if (!res.ok) {
      return {
        isConnected: false,
        environment: 'sandbox',
        ebayUsername: null,
        connectedAt: null,
        tokenExpiresAt: null,
        scopes: [],
        lastCheckedAt: nowIso,
        status: 'error',
        message: `Risposta dal server backend: HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();

    // Rileva la presenza reale del collegamento comunicata dal server
    const isConnected = Boolean(data?.isConnected);

    return {
      isConnected,
      environment: data?.environment || 'sandbox',
      ebayUsername: isConnected ? data?.ebayUsername || null : null,
      connectedAt: isConnected ? data?.connectedAt || null : null,
      tokenExpiresAt: isConnected ? data?.tokenExpiresAt || null : null,
      scopes: Array.isArray(data?.scopes) ? data.scopes : ['https://api.ebay.com/oauth/api_scope'],
      lastCheckedAt: nowIso,
      status: isConnected ? 'connected' : 'not_connected',
      message: data?.message || (isConnected ? 'Account eBay collegato con successo' : 'Nessun account eBay Sandbox collegato'),
      rawDetails: data,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const errorMsg = isAbort
      ? 'Timeout di connessione (8s) verso il backend Netlify Functions.'
      : err instanceof Error
      ? err.message
      : 'Errore di rete';

    return {
      isConnected: false,
      environment: 'sandbox',
      ebayUsername: null,
      connectedAt: null,
      tokenExpiresAt: null,
      scopes: [],
      lastCheckedAt: nowIso,
      status: 'backend_not_configured',
      message: `Impossibile raggiungere il backend OAuth (${endpoint}): ${errorMsg}. In attesa del deploy della funzione Netlify.`,
    };
  }
}

/**
 * Richiede al backend l'inizializzazione del flusso OAuth con generazione del parametro state
 * crittograficamente sicuro e univoco.
 * Il desktop non manipola RuName o Client Secret: riceve solo l'URL ufficiale verso cui indirizzare il browser.
 */
export async function initiateEbayOAuth(): Promise<EbayOAuthInitResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Client Supabase non inizializzato.',
    };
  }

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return {
      success: false,
      error: 'Sessione utente assente o scaduta. Effettua nuovamente il login.',
    };
  }

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-oauth-init`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return {
        success: false,
        isBackendMissing: true,
        error: `La funzione serverless di autorizzazione (${endpoint}) non è ancora disponibile (HTTP ${res.status}). La funzione Netlify 'ebay-oauth-init' deve essere pubblicata nel repository del sito per avviare il flusso.`,
      };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        success: false,
        error: errJson?.error || `Il backend ha risposto con errore HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    if (!data?.authorizationUrl) {
      return {
        success: false,
        error: 'Il backend non ha restituito un URL di autorizzazione valido.',
      };
    }

    return {
      success: true,
      authorizationUrl: data.authorizationUrl,
      state: data.state,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto di connessione';
    return {
      success: false,
      isBackendMissing: true,
      error: `Impossibile contattare il backend per avviare OAuth (${endpoint}): ${errorMsg}. In attesa del deploy delle Netlify Functions.`,
    };
  }
}

/**
 * Richiede la disconnessione dell'account eBay al backend Netlify.
 * Il backend invaliderà il record nel database per il venditore autenticato.
 */
export async function disconnectEbayAccount(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Client Supabase non inizializzato' };
  }

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { success: false, error: 'Sessione utente assente' };
  }

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-oauth-disconnect`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) {
      return {
        success: false,
        error: 'Funzione di disconnessione non ancora distribuita sul backend Netlify.',
      };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        success: false,
        error: errJson?.error || `Errore del server durante la disconnessione (HTTP ${res.status})`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore di connessione';
    return { success: false, error: `Impossibile completare la disconnessione: ${errorMsg}` };
  }
}
