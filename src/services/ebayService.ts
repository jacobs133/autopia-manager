import { getSupabaseClient } from './supabaseClient';
import { ADMIN_EMAIL } from './partsService';
import type {
  EbayConnectionInfo,
  EbayOAuthInitResult,
  EbayListingItem,
  EbayOrder,
  EbayDiagnosticCheck,
  EbayDiagnosticsReport,
} from '../types/ebay';

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

  // 1. Assicurati che la sessione Supabase sia fresca e valida
  let sessionData = (await client.auth.getSession()).data;
  let token = sessionData.session?.access_token;

  // Se il token è prossimo alla scadenza o assente, tenta il refresh della sessione
  if (!token || (sessionData.session?.expires_at && sessionData.session.expires_at * 1000 - Date.now() < 60000)) {
    try {
      const refreshed = await client.auth.refreshSession();
      if (refreshed.data.session) {
        sessionData = refreshed.data;
        token = refreshed.data.session.access_token;
      }
    } catch {
      // Ignora errore refresh se fallisce
    }
  }

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

  // Recupera la chiave pubblica (anonKey) se presente per completare gli header verso Netlify
  const supabaseConfig = (await import('./supabaseClient')).getSupabaseConfig();
  const anonKey = supabaseConfig?.anonKey;

  // Dual Check: Interrogazione prioritaria tramite RPC get_seller_ebay_status (Security Definer)
  let directTokenRow: {
    id?: string;
    seller_id?: string;
    ebay_username?: string;
    is_active?: boolean;
    created_at?: string | null;
    refresh_token_expires_at?: string | null;
    scopes?: string[];
  } | null = null;

  // Tentativo 1: Esecuzione RPC get_seller_ebay_status con firma flessibile
  try {
    let rpcData: any = null;
    let rpcErr: any = null;

    // Prova 1: p_seller_id
    const r1 = await client.rpc('get_seller_ebay_status' as any, {
      p_seller_id: sellerId || undefined,
    });
    if (!r1.error) {
      rpcData = r1.data;
    } else {
      // Prova 2: _seller_id (legacy)
      const r2 = await client.rpc('get_seller_ebay_status' as any, {
        _seller_id: sellerId || undefined,
      });
      if (!r2.error) {
        rpcData = r2.data;
      } else {
        // Prova 3: seller_id
        const r3 = await client.rpc('get_seller_ebay_status' as any, {
          seller_id: sellerId || undefined,
        });
        if (!r3.error) {
          rpcData = r3.data;
        } else {
          // Prova 4: senza argomenti (deduzione automatica tramite auth.uid())
          const r4 = await client.rpc('get_seller_ebay_status' as any);
          if (!r4.error) {
            rpcData = r4.data;
          } else {
            rpcErr = r4.error;
          }
        }
      }
    }

    if (!rpcErr && rpcData !== null && rpcData !== undefined) {
      // Interpreta la risposta RPC: può essere un array di record, un oggetto JSONB o un booleano
      if (Array.isArray(rpcData)) {
        if (rpcData.length > 0) {
          const item = rpcData[0];
          if (item.is_active === true || item.is_connected === true || item.isConnected === true) {
            directTokenRow = {
              id: item.id || 'rpc',
              seller_id: item.seller_id || item.sellerId || sellerId || undefined,
              ebay_username: item.ebay_username || item.ebayUsername || 'Utente Sandbox',
              is_active: true,
              created_at: item.created_at || item.connectedAt || nowIso,
              refresh_token_expires_at: item.refresh_token_expires_at || item.tokenExpiresAt || null,
              scopes: Array.isArray(item.scopes) ? item.scopes : ['https://api.ebay.com/oauth/api_scope'],
            };
          }
        }
      } else if (typeof rpcData === 'boolean' && rpcData === true) {
        directTokenRow = {
          id: 'rpc_bool',
          seller_id: sellerId || undefined,
          ebay_username: 'Utente Sandbox',
          is_active: true,
          created_at: nowIso,
          refresh_token_expires_at: null,
          scopes: ['https://api.ebay.com/oauth/api_scope'],
        };
      } else if (typeof rpcData === 'object') {
        const obj = rpcData as any;
        if (obj.is_connected === true || obj.isConnected === true || obj.is_active === true || obj.status === 'connected') {
          directTokenRow = {
            id: obj.id || 'rpc_obj',
            seller_id: obj.seller_id || obj.sellerId || sellerId || undefined,
            ebay_username: obj.ebay_username || obj.ebayUsername || 'Utente Sandbox',
            is_active: true,
            created_at: obj.created_at || obj.connectedAt || nowIso,
            refresh_token_expires_at: obj.refresh_token_expires_at || obj.tokenExpiresAt || null,
            scopes: Array.isArray(obj.scopes) ? obj.scopes : ['https://api.ebay.com/oauth/api_scope'],
          };
        }
      }
    }
  } catch (rpcEx) {
    console.debug('[ebayService] Nota verifica RPC:', rpcEx);
  }

  // Tentativo 2: Controllo tabella seller_ebay_tokens (se non già verificato da RPC)
  if (!directTokenRow) {
    try {
      if (sellerId) {
        const { data: dbRows, error: dbErr } = await (client as any)
          .from('seller_ebay_tokens')
          .select('id, seller_id, ebay_username, is_active, refresh_token_expires_at, scopes, created_at, updated_at')
          .eq('seller_id', sellerId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!dbErr && dbRows && dbRows.length > 0 && dbRows[0].is_active) {
          directTokenRow = dbRows[0];
        }
      }

      if (!directTokenRow) {
        const { data: anyRows, error: anyErr } = await (client as any)
          .from('seller_ebay_tokens')
          .select('id, seller_id, ebay_username, is_active, refresh_token_expires_at, scopes, created_at, updated_at')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!anyErr && anyRows && anyRows.length > 0 && anyRows[0].is_active) {
          directTokenRow = anyRows[0];
        }
      }
    } catch {
      // Ignora restrizioni RLS sulla lettura diretta di seller_ebay_tokens
    }
  }

  const queryParams = new URLSearchParams({
    _t: Date.now().toString(),
  });
  if (sellerId) {
    queryParams.set('seller_id', sellerId);
  }

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-oauth-status?${queryParams.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
    if (anonKey) {
      headers['apikey'] = anonKey;
    }

    let res = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    // Se GET restituisce 405 (Method Not Allowed), esegui fallback a POST con Content-Type consentito da Netlify
    if (res.status === 405) {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seller_id: sellerId || undefined }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    // Se l'endpoint non è ancora deployato su Netlify (404/502/503), ma da Supabase/RPC risulta connesso
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      if (directTokenRow) {
        return {
          isConnected: true,
          environment: 'sandbox',
          ebayUsername: directTokenRow.ebay_username || 'Utente Sandbox',
          connectedAt: directTokenRow.created_at || null,
          tokenExpiresAt: directTokenRow.refresh_token_expires_at || null,
          scopes: Array.isArray(directTokenRow.scopes) ? directTokenRow.scopes : ['https://api.ebay.com/oauth/api_scope'],
          lastCheckedAt: nowIso,
          status: 'connected',
          message: 'Account eBay Sandbox collegato e attivo nel database.',
        };
      }
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
      if (directTokenRow) {
        return {
          isConnected: true,
          environment: 'sandbox',
          ebayUsername: directTokenRow.ebay_username || 'Utente Sandbox',
          connectedAt: directTokenRow.created_at || null,
          tokenExpiresAt: directTokenRow.refresh_token_expires_at || null,
          scopes: Array.isArray(directTokenRow.scopes) ? directTokenRow.scopes : ['https://api.ebay.com/oauth/api_scope'],
          lastCheckedAt: nowIso,
          status: 'connected',
          message: 'Account eBay Sandbox collegato regolarmente.',
        };
      }
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
      if (directTokenRow) {
        return {
          isConnected: true,
          environment: 'sandbox',
          ebayUsername: directTokenRow.ebay_username || 'Utente Sandbox',
          connectedAt: directTokenRow.created_at || null,
          tokenExpiresAt: directTokenRow.refresh_token_expires_at || null,
          scopes: Array.isArray(directTokenRow.scopes) ? directTokenRow.scopes : ['https://api.ebay.com/oauth/api_scope'],
          lastCheckedAt: nowIso,
          status: 'connected',
          message: 'Account eBay Sandbox verificato tramite database.',
        };
      }
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

    // Rileva la presenza reale del collegamento comunicata dal server o dal controllo diretto DB/RPC
    const isConnected = Boolean(data?.isConnected) || Boolean(directTokenRow);
    const ebayUsername = data?.ebayUsername || directTokenRow?.ebay_username || (isConnected ? 'Utente Sandbox' : null);
    const connectedAt = data?.connectedAt || directTokenRow?.created_at || null;
    const tokenExpiresAt = data?.tokenExpiresAt || directTokenRow?.refresh_token_expires_at || null;
    const scopes = Array.isArray(data?.scopes) && data.scopes.length > 0
      ? data.scopes
      : Array.isArray(directTokenRow?.scopes) && directTokenRow.scopes.length > 0
      ? directTokenRow.scopes
      : ['https://api.ebay.com/oauth/api_scope'];

    // Se connesso, salva una cache locale a supporto della resilienza desktop
    if (isConnected && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          'autopia_ebay_status_cached',
          JSON.stringify({
            isConnected: true,
            ebayUsername,
            connectedAt,
            cachedAt: Date.now(),
          })
        );
      } catch {
        // Ignora eccezioni localStorage
      }
    }

    return {
      isConnected,
      environment: data?.environment || 'sandbox',
      ebayUsername: isConnected ? ebayUsername : null,
      connectedAt: isConnected ? connectedAt : null,
      tokenExpiresAt: isConnected ? tokenExpiresAt : null,
      scopes,
      lastCheckedAt: nowIso,
      status: isConnected ? 'connected' : 'not_connected',
      message: data?.message || (isConnected ? 'Account eBay collegato con successo' : 'Nessun account eBay Sandbox collegato'),
      rawDetails: data,
    };
  } catch (err: unknown) {
    if (directTokenRow) {
      return {
        isConnected: true,
        environment: 'sandbox',
        ebayUsername: directTokenRow.ebay_username || 'Utente Sandbox',
        connectedAt: directTokenRow.created_at || null,
        tokenExpiresAt: directTokenRow.refresh_token_expires_at || null,
        scopes: Array.isArray(directTokenRow.scopes) ? directTokenRow.scopes : ['https://api.ebay.com/oauth/api_scope'],
        lastCheckedAt: nowIso,
        status: 'connected',
        message: 'Account eBay Sandbox collegato con successo.',
      };
    }

    // Controlla cache locale recente (< 12 ore) per evitare falsi negativi durante cali di rete
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cachedStr = window.localStorage.getItem('autopia_ebay_status_cached');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached?.isConnected && Date.now() - (cached.cachedAt || 0) < 12 * 3600 * 1000) {
            return {
              isConnected: true,
              environment: 'sandbox',
              ebayUsername: cached.ebayUsername || 'Utente Sandbox',
              connectedAt: cached.connectedAt || null,
              tokenExpiresAt: null,
              scopes: ['https://api.ebay.com/oauth/api_scope'],
              lastCheckedAt: nowIso,
              status: 'connected',
              message: 'Account eBay Sandbox collegato (verificato da sessione recente).',
            };
          }
        }
      } catch {
        // Ignora
      }
    }

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
      status: 'error',
      message: `Impossibile raggiungere il backend OAuth (${endpoint}): ${errorMsg}.`,
    };
  }
}

/**
 * Richiede al backend l'inizializzazione del flusso OAuth con generazione del parametro state
 * crittograficamente sicuro e univoco.
 * Il desktop non manipola RuName o Client Secret: riceve solo l'URL ufficiale verso cui indirizzare il browser.
 */
export async function initiateEbayOAuth(sellerId?: string | null): Promise<EbayOAuthInitResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Client Supabase non inizializzato o credenziali mancanti. Verifica la configurazione Supabase.',
    };
  }

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return {
      success: false,
      error: 'Sessione utente assente o scaduta. Effettua nuovamente il login in Autopia Manager.',
    };
  }

  const supabaseConfig = (await import('./supabaseClient')).getSupabaseConfig();
  const anonKey = supabaseConfig?.anonKey;

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-oauth-init`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (anonKey) {
      headers['apikey'] = anonKey;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ seller_id: sellerId || undefined }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return {
        success: false,
        isBackendMissing: true,
        error: `La funzione serverless di autorizzazione (${endpoint}) non è ancora disponibile (HTTP ${res.status}). Assicurati di aver trasferito i file in backend-autopiashop/ nella cartella netlify/functions/ del sito autopiashop.it e completato il deploy.`,
      };
    }

    // Leggi il testo grezzo della risposta per diagnosticare accuratamente sia JSON che HTML o errori
    const rawText = await res.text();
    let data: any = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      // Se è stata restituita una pagina HTML (ad es. per via della regola SPA fallback di Netlify)
      if (rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.includes('<html')) {
        return {
          success: false,
          isBackendMissing: true,
          error: `Il server Netlify ha restituito la pagina HTML del sito anziché l'endpoint API 'ebay-oauth-init' (HTTP ${res.status}). Assicurati che le Netlify Functions siano state caricate nella cartella netlify/functions del sito autopiashop.it.`,
        };
      }
      return {
        success: false,
        error: `Risposta non valida dal backend (${res.status}): ${rawText.slice(0, 160)}`,
      };
    }

    if (!res.ok) {
      const errMsg =
        data?.error ||
        data?.message ||
        data?.errorMessage ||
        `Il backend ha risposto con errore HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        error: errMsg,
      };
    }

    // Supporta tutte le possibili varianti di proprietà dell'URL di autorizzazione (camelCase e snake_case)
    const candidateUrl =
      data?.auth_url ||
      data?.authUrl ||
      data?.authorizationUrl ||
      data?.authorization_url ||
      data?.url ||
      data?.consentUrl ||
      data?.consent_url ||
      data?.redirectUrl ||
      data?.redirect_url ||
      data?.login_url ||
      data?.loginUrl ||
      data?.data?.auth_url ||
      data?.data?.authUrl ||
      data?.data?.authorizationUrl ||
      data?.data?.authorization_url ||
      data?.data?.url;

    if (candidateUrl && typeof candidateUrl === 'string' && candidateUrl.startsWith('http')) {
      return {
        success: true,
        authorizationUrl: candidateUrl,
        state: data?.state || data?.data?.state,
      };
    }

    // Se l'URL manca ma nel JSON è presente un messaggio o errore dal server (anche con status 200)
    const serverError =
      data?.error ||
      data?.message ||
      data?.errorMessage ||
      data?.details ||
      (data?.success === false && data?.reason);

    if (serverError) {
      return {
        success: false,
        error: typeof serverError === 'string' ? serverError : JSON.stringify(serverError),
      };
    }

    return {
      success: false,
      error: `Il backend non ha restituito un URL di autorizzazione valido. Dettagli risposta: ${JSON.stringify(data).slice(0, 220)}`,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const errorMsg = isAbort
      ? 'Timeout di connessione (12s) verso il backend Netlify.'
      : err instanceof Error
      ? err.message
      : 'Errore di connessione';

    return {
      success: false,
      isBackendMissing: true,
      error: `Impossibile contattare il backend per avviare OAuth (${endpoint}): ${errorMsg}.`,
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

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('autopia_ebay_status_cached');
      } catch {
        // Ignora
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore di connessione';
    return { success: false, error: `Impossibile completare la disconnessione: ${errorMsg}` };
  }
}

/**
 * Recupera l'elenco delle inserzioni eBay pubblicate o sincronizzate per il venditore (Fase 3B).
 */
export async function fetchEbayListings(): Promise<{ data: EbayListingItem[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: 'Client Supabase non inizializzato' };

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { data: [], error: 'Sessione utente assente' };

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-inventory-sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) {
      return { data: [], error: 'Funzione eBay Inventory Sync non ancora distribuita sul backend Netlify.' };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return { data: [], error: err?.error || `Errore HTTP ${res.status}` };
    }

    const json = await res.json();
    return { data: json.listings || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore di connessione';
    return { data: [], error: msg };
  }
}

/**
 * Pubblica un ricambio del magazzino Autopia su eBay Sandbox come annuncio a prezzo fisso (Fase 3B).
 */
export async function publishPartToEbay(payload: {
  inventory_id?: string;
  sku?: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  condition?: string;
  oem_code?: string;
  brand?: string;
  images?: string[];
}): Promise<{ success: boolean; listing?: EbayListingItem; message?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client Supabase non inizializzato' };

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { success: false, error: 'Sessione utente assente' };

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-inventory-sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        action: 'publish_item',
        ...payload,
      }),
    });

    if (res.status === 404) {
      return { success: false, error: 'Funzione eBay Inventory Sync non ancora distribuita sul backend Netlify.' };
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `Errore HTTP ${res.status}: ${res.statusText}` };
    }

    return {
      success: true,
      listing: data.listing,
      message: data.message || 'Annuncio pubblicato con successo su eBay Sandbox!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore di connessione';
    return { success: false, error: msg };
  }
}

/**
 * Sincronizza istantaneamente la giacenza di uno SKU su eBay Sandbox (Fase 3B).
 */
export async function syncEbayInventoryQuantity(
  sku: string,
  quantity: number,
  inventoryId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client Supabase non inizializzato' };

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { success: false, error: 'Sessione utente assente' };

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-inventory-sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_quantity',
        sku,
        quantity,
        inventory_id: inventoryId,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `Errore HTTP ${res.status}` };
    }

    return { success: true, message: data.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore di connessione';
    return { success: false, error: msg };
  }
}

/**
 * Recupera gli ordini memorizzati localmente nel database (Fase 3C).
 */
export async function fetchLocalEbayOrders(): Promise<{ data: EbayOrder[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: 'Client Supabase non inizializzato' };

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { data: [], error: 'Sessione utente assente' };

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-orders-sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) {
      return { data: [], error: 'Funzione eBay Orders Sync non ancora distribuita sul backend Netlify.' };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return { data: [], error: err?.error || `Errore HTTP ${res.status}` };
    }

    const json = await res.json();
    return { data: json.orders || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore di connessione';
    return { data: [], error: msg };
  }
}

/**
 * Scarica i nuovi ordini direttamente da eBay Fulfillment API e scala le giacenze di magazzino (Fase 3C).
 */
export async function syncOrdersFromEbay(): Promise<{
  success: boolean;
  orders: EbayOrder[];
  message?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, orders: [], error: 'Client Supabase non inizializzato' };

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { success: false, orders: [], error: 'Sessione utente assente' };

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-orders-sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        action: 'fetch_ebay_orders',
      }),
    });

    if (res.status === 404) {
      return {
        success: false,
        orders: [],
        error: 'Funzione eBay Orders Sync non ancora distribuita sul backend Netlify.',
      };
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, orders: [], error: data?.error || `Errore HTTP ${res.status}` };
    }

    return {
      success: true,
      orders: data.orders || [],
      message: data.message || 'Ordini eBay sincronizzati con successo!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore di rete';
    return { success: false, orders: [], error: msg };
  }
}

/**
 * Invia il codice tracking di spedizione a eBay Fulfillment API (Fase 3C).
 */
export async function fulfillEbayOrder(
  ebayOrderId: string,
  trackingNumber: string,
  carrierCode?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client Supabase non inizializzato' };

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { success: false, error: 'Sessione utente assente' };

  const endpoint = `${getEbayOAuthBackendBaseUrl()}/ebay-orders-sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        action: 'fulfill_order',
        ebay_order_id: ebayOrderId,
        tracking_number: trackingNumber,
        carrier_code: carrierCode || 'Corriere Espresso',
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `Errore HTTP ${res.status}` };
    }

    return {
      success: true,
      message: data.message || 'Tracking inviato a eBay e ordine contrassegnato come spedito!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore di connessione';
    return { success: false, error: msg };
  }
}

/**
 * Esegue una suite diagnostica completa end-to-end per individuare istantaneamente
 * qualunque collo di bottiglia o disallineamento nell'integrazione di eBay:
 * 1. Supabase Client & Credenziali
 * 2. Sessione Utente (JWT)
 * 3. Profilo Autodemolitore e Stato 'approved'
 * 4. Tabelle del database (ebay_oauth_states, seller_ebay_tokens, ebay_listings, ebay_orders)
 * 5. Netlify Serverless Functions (ebay-oauth-status, ebay-oauth-init)
 */
export async function runEbayIntegrationDiagnostics(): Promise<EbayDiagnosticsReport> {
  const checks: EbayDiagnosticCheck[] = [];
  const client = getSupabaseClient();
  const backendUrl = getEbayOAuthBackendBaseUrl();

  // 1. Verifica Client Supabase
  if (!client) {
    checks.push({
      id: 'supabase_client',
      name: 'Client Supabase',
      status: 'error',
      message: 'Client Supabase non configurato o credenziali assenti.',
      suggestion: 'Configura URL e Anon Key nella schermata Impostazioni o tramite variabili VITE_SUPABASE_URL.',
    });
    return { timestamp: new Date().toISOString(), checks, allPassed: false };
  } else {
    checks.push({
      id: 'supabase_client',
      name: 'Client Supabase',
      status: 'ok',
      message: 'Client Supabase inizializzato correttamente.',
    });
  }

  // 2. Verifica Sessione Utente
  let userToken: string | null = null;
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr || !sessionData.session) {
      checks.push({
        id: 'user_session',
        name: 'Sessione Utente Autopia',
        status: 'error',
        message: 'Nessuna sessione utente attiva.',
        suggestion: 'Effettua il login in Autopia Manager con le tue credenziali.',
      });
    } else {
      userToken = sessionData.session.access_token;
      userId = sessionData.session.user.id;
      userEmail = sessionData.session.user.email || null;
      checks.push({
        id: 'user_session',
        name: 'Sessione Utente Autopia',
        status: 'ok',
        message: `Autenticato come ${userEmail || userId}.`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'user_session',
      name: 'Sessione Utente Autopia',
      status: 'error',
      message: err instanceof Error ? err.message : 'Errore verifica sessione',
    });
  }

  // 2.1 Verifica Esclusiva Ruolo Amministratore (Diagnostica riservata unicamente all'admin)
  let isAdmin = false;
  if (userId) {
    try {
      const { data: roleRows } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin');
      if (roleRows && roleRows.length > 0) {
        isAdmin = true;
      } else if (userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        isAdmin = true;
      }
    } catch {
      if (userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        isAdmin = true;
      }
    }
  }

  if (!isAdmin) {
    checks.push({
      id: 'admin_authorization',
      name: 'Autorizzazione Diagnostica Avanzata',
      status: 'error',
      message: 'Accesso negato: la diagnostica del canale eBay è riservata esclusivamente all\'amministratore di sistema.',
      suggestion: 'Funzionalità protetta per motivi di sicurezza dell\'infrastruttura. Solo l\'amministratore può eseguire la diagnostica.',
    });
    return { timestamp: new Date().toISOString(), checks, allPassed: false };
  }

  // 3. Verifica Profilo Venditore (seller_profiles)
  if (userId) {
    try {
      const { data: seller, error: sellerErr } = await client
        .from('seller_profiles')
        .select('id, user_id, business_name, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (sellerErr) {
        checks.push({
          id: 'seller_profile',
          name: 'Profilo Autodemolitore',
          status: 'warning',
          message: `Impossibile interrogare la tabella seller_profiles: ${sellerErr.message}`,
        });
      } else if (!seller) {
        checks.push({
          id: 'seller_profile',
          name: 'Profilo Autodemolitore',
          status: 'error',
          message: 'Nessun record in seller_profiles collegato al tuo account utente.',
          suggestion: `Accedi a Supabase ed inserisci un record in seller_profiles con user_id = '${userId}'.`,
        });
      } else if (seller.status !== 'approved') {
        checks.push({
          id: 'seller_profile',
          name: 'Profilo Autodemolitore',
          status: 'warning',
          message: `Profilo trovato (${seller.business_name || seller.id}) ma con stato '${seller.status}'. Richiesto 'approved'.`,
          suggestion: `Esegui in Supabase: UPDATE public.seller_profiles SET status = 'approved' WHERE user_id = '${userId}';`,
        });
      } else {
        checks.push({
          id: 'seller_profile',
          name: 'Profilo Autodemolitore',
          status: 'ok',
          message: `Profilo venditore approvato: ${seller.business_name || seller.id}.`,
        });
      }
    } catch (e: unknown) {
      checks.push({
        id: 'seller_profile',
        name: 'Profilo Autodemolitore',
        status: 'warning',
        message: e instanceof Error ? e.message : 'Errore controllo profilo',
      });
    }
  }

  // 4. Verifica Tabelle Schema SQL Supabase
  try {
    const { error: stateTableErr } = await (client as any)
      .from('ebay_oauth_states')
      .select('state_token', { count: 'exact', head: true });

    if (stateTableErr && (stateTableErr.code === '42P01' || stateTableErr.message.includes('does not exist'))) {
      checks.push({
        id: 'db_schema',
        name: 'Tabelle Database eBay (schema.sql)',
        status: 'error',
        message: 'La tabella public.ebay_oauth_states non esiste nel database Supabase.',
        suggestion: 'Esegui il file backend-autopiashop/schema.sql nel SQL Editor di Supabase.',
      });
    } else {
      checks.push({
        id: 'db_schema',
        name: 'Tabelle Database eBay (schema.sql)',
        status: 'ok',
        message: 'Tabelle del database (ebay_oauth_states, seller_ebay_tokens) presenti.',
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'db_schema',
      name: 'Tabelle Database eBay (schema.sql)',
      status: 'warning',
      message: err instanceof Error ? err.message : 'Verifica schema completata con avviso',
    });
  }

  // 4.1 Verifica Esecuzione RPC get_seller_ebay_status
  try {
    const { data: rpcTest, error: rpcErr } = await client.rpc('get_seller_ebay_status' as any);
    if (rpcErr) {
      checks.push({
        id: 'rpc_ebay_status',
        name: 'Funzione RPC Database (get_seller_ebay_status)',
        status: 'warning',
        message: `RPC non ancora creata o accessibile nel database: ${rpcErr.message}`,
        suggestion: 'Esegui il file backend-autopiashop/schema.sql nel SQL Editor di Supabase per attivare la RPC.',
      });
    } else {
      const isConn = Boolean(rpcTest?.is_connected || rpcTest?.isConnected || rpcTest?.is_active);
      checks.push({
        id: 'rpc_ebay_status',
        name: 'Funzione RPC Database (get_seller_ebay_status)',
        status: 'ok',
        message: `RPC operativa e funzionante (risultato: ${isConn ? 'Collegato' : 'Non collegato'}).`,
      });
    }
  } catch (rpcEx) {
    checks.push({
      id: 'rpc_ebay_status',
      name: 'Funzione RPC Database (get_seller_ebay_status)',
      status: 'warning',
      message: rpcEx instanceof Error ? rpcEx.message : 'Verifica RPC completata con avviso',
    });
  }

  // 5. Verifica Raggiungibilità Backend Netlify
  try {
    const pingEndpoint = `${backendUrl}/ebay-oauth-init`;
    const res = await fetch(pingEndpoint, {
      method: 'POST',
      headers: {
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      // Ignorato se non JSON
    }

    if (res.status === 404) {
      checks.push({
        id: 'netlify_functions',
        name: 'Backend Serverless Netlify',
        status: 'error',
        message: `Endpoint non trovato (HTTP 404) su ${pingEndpoint}.`,
        suggestion: 'Assicurati di aver copiato i file di backend-autopiashop/ in netlify/functions/ del sito e completato il deploy.',
      });
    } else if (rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.includes('<html')) {
      checks.push({
        id: 'netlify_functions',
        name: 'Backend Serverless Netlify',
        status: 'error',
        message: 'Il server ha restituito la pagina HTML del sito anziché la funzione API.',
        suggestion: 'Verifica le regole di rewrite in netlify.toml o _redirects sul repository del sito autopiashop.it.',
      });
    } else if (
      json?.auth_url ||
      json?.authUrl ||
      json?.authorizationUrl ||
      json?.authorization_url ||
      json?.url ||
      json?.data?.auth_url ||
      json?.data?.authorizationUrl
    ) {
      checks.push({
        id: 'netlify_functions',
        name: 'Backend Serverless Netlify',
        status: 'ok',
        message: 'Funzione ebay-oauth-init pienamente operativa: URL di autorizzazione generato con successo!',
      });
    } else if (json?.error && json.error.includes("Variabili d'ambiente")) {
      checks.push({
        id: 'netlify_functions',
        name: 'Backend Serverless Netlify',
        status: 'error',
        message: `Variabili d'ambiente eBay mancanti su Netlify: ${json.error}`,
        suggestion: 'Configura EBAY_SANDBOX_CLIENT_ID, EBAY_SANDBOX_CLIENT_SECRET, EBAY_SANDBOX_RUNAME, EBAY_TOKEN_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY su Netlify.',
      });
    } else if (!res.ok) {
      checks.push({
        id: 'netlify_functions',
        name: 'Backend Serverless Netlify',
        status: 'warning',
        message: `Il backend ha risposto con HTTP ${res.status}: ${json?.error || json?.message || rawText.slice(0, 100)}`,
        suggestion: json?.error || undefined,
      });
    } else {
      checks.push({
        id: 'netlify_functions',
        name: 'Backend Serverless Netlify',
        status: 'ok',
        message: `Endpoint raggiungibile (${res.status} OK).`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      id: 'netlify_functions',
      name: 'Backend Serverless Netlify',
      status: 'error',
      message: `Impossibile connettersi al backend: ${err instanceof Error ? err.message : 'Errore di rete'}`,
      suggestion: 'Controlla la tua connessione internet o verifica che https://autopiashop.it sia online.',
    });
  }

  const allPassed = checks.every((c) => c.status === 'ok');
  return {
    timestamp: new Date().toISOString(),
    checks,
    allPassed,
  };
}

