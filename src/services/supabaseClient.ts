import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const STORAGE_KEY = 'autopia_manager_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isFromEnv: boolean;
}

let cachedClient: SupabaseClient<Database> | null = null;
let currentConfig: SupabaseConfig | null = null;

/**
 * Valida la forma dell'URL e della chiave pubblica anonima.
 */
export function validateSupabaseCredentials(url: string, anonKey: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { valid: false, error: 'URL del progetto Supabase mancante' };
  }
  const trimmedUrl = url.trim();
  try {
    const parsed = new URL(trimmedUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'L\'URL deve iniziare con https:// o http://' };
    }
  } catch {
    return { valid: false, error: 'Formato URL Supabase non valido' };
  }

  if (!anonKey || typeof anonKey !== 'string' || anonKey.trim() === '') {
    return { valid: false, error: 'Chiave pubblica (anon key) mancante' };
  }
  if (anonKey.trim().length < 20) {
    return { valid: false, error: 'La chiave pubblica sembra incompleta o troppo breve' };
  }

  return { valid: true };
}

/**
 * Recupera la configurazione corrente di Supabase.
 * Controlla prima le variabili di ambiente Vite (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY),
 * poi la configurazione salvata localmente nel client desktop.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process?.env?.VITE_SUPABASE_URL);
  const envKey =
    (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process?.env?.VITE_SUPABASE_ANON_KEY);

  if (envUrl && envKey) {
    const validation = validateSupabaseCredentials(envUrl, envKey);
    if (validation.valid) {
      return {
        url: envUrl.trim(),
        anonKey: envKey.trim(),
        isFromEnv: true,
      };
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.url && parsed?.anonKey) {
          const validation = validateSupabaseCredentials(parsed.url, parsed.anonKey);
          if (validation.valid) {
            return {
              url: parsed.url.trim(),
              anonKey: parsed.anonKey.trim(),
              isFromEnv: false,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Impossibile leggere la configurazione locale di Supabase:', e);
    }
  }

  return null;
}

/**
 * Salva la configurazione inserita dall'utente nel client desktop.
 */
export function saveSupabaseConfig(url: string, anonKey: string): { success: boolean; error?: string } {
  const validation = validateSupabaseCredentials(url, anonKey);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: url.trim(),
        anonKey: anonKey.trim(),
        updatedAt: new Date().toISOString(),
      })
    );
    // Invalida il client cached per ricrearlo al prossimo accesso
    cachedClient = null;
    currentConfig = null;
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Errore durante il salvataggio locale della configurazione' };
  }
}

/**
 * Rimuove la configurazione locale inserita.
 */
export function clearSupabaseConfig(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedClient = null;
    currentConfig = null;
  } catch (err) {
    console.warn('Errore durante la rimozione della configurazione locale:', err);
  }
}

/**
 * Restituisce l'istanza singleton del client Supabase tipizzata con lo schema di Autopia.
 * Restituisce null se la configurazione non è ancora presente o non valida.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const config = getSupabaseConfig();
  if (!config) {
    cachedClient = null;
    currentConfig = null;
    return null;
  }

  // Se la configurazione non è cambiata e abbiamo già un'istanza, riutilizzala
  if (
    cachedClient &&
    currentConfig &&
    currentConfig.url === config.url &&
    currentConfig.anonKey === config.anonKey
  ) {
    return cachedClient;
  }

  cachedClient = createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Disattivato in ambiente desktop (nessun redirect hash browser)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  currentConfig = config;

  return cachedClient;
}

/**
 * Verifica reale di connettività verso il backend Supabase.
 * Interroga un endpoint pubblico di sola lettura per verificare la risposta HTTP del server.
 */
export async function testBackendConnection(url: string, anonKey: string): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
}> {
  const validation = validateSupabaseCredentials(url, anonKey);
  if (!validation.valid) {
    return { success: false, message: validation.error || 'Credenziali non valide' };
  }

  try {
    const testClient = createClient<Database>(url.trim(), anonKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Effettua una query di test leggera (es. tabella part_categories o controllo sessione anonima)
    const { error, status } = await testClient
      .from('part_categories')
      .select('id', { count: 'exact', head: true });

    if (error && status === 0) {
      return {
        success: false,
        message: 'Impossibile raggiungere il server Supabase. Verifica la connessione di rete o l\'URL del progetto.',
      };
    }

    if (status === 401 || status === 403) {
      return {
        success: false,
        message: 'Connessione stabilita, ma la chiave pubblica anon/publishable inserita è stata rifiutata dal server (401/403).',
        statusCode: status,
      };
    }

    return {
      success: true,
      message: 'Connessione al backend Autopia verificata con successo.',
      statusCode: status,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Errore imprevisto durante il test di connessione',
    };
  }
}
