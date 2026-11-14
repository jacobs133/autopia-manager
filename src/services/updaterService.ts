import type { Update } from '@tauri-apps/plugin-updater';

export interface AppUpdateInfo {
  version: string;
  currentVersion: string;
  releaseNotes?: string;
  releaseDate?: string;
  rawUpdate?: Update | null;
}

export type UpdateInstallStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'AVAILABLE'
  | 'DOWNLOADING'
  | 'INSTALLING'
  | 'READY_TO_RELAUNCH'
  | 'UP_TO_DATE'
  | 'ERROR';

export interface UpdateProgress {
  status: UpdateInstallStatus;
  percentage: number;
  downloadedBytes: number;
  totalBytes: number;
  stepMessage?: string;
  errorMessage?: string;
}

const STORAGE_KEYS = {
  LAST_CHECK: 'autopia_last_update_check_timestamp',
  AUTO_CHECK: 'autopia_updater_auto_check_enabled',
  INTERVAL_HOURS: 'autopia_updater_interval_hours',
  POSTPONED_VERSION: 'autopia_updater_postponed_version',
};

/**
 * Rileva se l'applicazione sta girando all'interno dell'ambiente desktop nativo Tauri compilato.
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

/**
 * Versione predefinita dell'applicazione definita nel client.
 */
export const APP_CURRENT_VERSION = '0.3.11';
let cachedAppVersion = APP_CURRENT_VERSION;

/**
 * Recupera la versione reale in esecuzione (tramite @tauri-apps/api/app se su desktop Windows).
 */
export async function getRuntimeAppVersion(): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      const v = await getVersion();
      if (v) {
        cachedAppVersion = v;
      }
    } catch {
      // Fallback alla versione statica configurata
    }
  }
  return cachedAppVersion;
}

/**
 * Gestione delle preferenze dell'utente per gli aggiornamenti automatici.
 */
export function getAutoCheckPreference(): boolean {
  const val = localStorage.getItem(STORAGE_KEYS.AUTO_CHECK);
  return val === null ? true : val === 'true';
}

export function setAutoCheckPreference(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.AUTO_CHECK, String(enabled));
}

export function getCheckIntervalHours(): number {
  const val = localStorage.getItem(STORAGE_KEYS.INTERVAL_HOURS);
  const parsed = val ? parseInt(val, 10) : 4;
  return Number.isNaN(parsed) || parsed < 1 ? 4 : parsed;
}

export function setCheckIntervalHours(hours: number): void {
  localStorage.setItem(STORAGE_KEYS.INTERVAL_HOURS, String(hours));
}

export function getPostponedVersion(): string | null {
  return localStorage.getItem(STORAGE_KEYS.POSTPONED_VERSION);
}

export function setPostponedVersion(version: string | null): void {
  if (version) {
    localStorage.setItem(STORAGE_KEYS.POSTPONED_VERSION, version);
  } else {
    localStorage.removeItem(STORAGE_KEYS.POSTPONED_VERSION);
  }
}

export function getLastCheckTimestamp(): number {
  const str = localStorage.getItem(STORAGE_KEYS.LAST_CHECK);
  return str ? parseInt(str, 10) || 0 : 0;
}

/**
 * Traduzione amichevole degli errori nativi in messaggi chiari in italiano per l'utente.
 */
function translateUpdaterError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('network') || lower.includes('connection') || lower.includes('failed to fetch') || lower.includes('dns') || lower.includes('timeout')) {
    return 'Connessione al server degli aggiornamenti non riuscita. Verifica che il computer sia connesso a Internet.';
  }
  if (lower.includes('signature') || lower.includes('verification') || lower.includes('minisign') || lower.includes('pubkey')) {
    return 'Firma crittografica dell\'aggiornamento non valida o pacchetto non autorizzato. L\'installazione è stata bloccata per la sicurezza del gestionale.';
  }
  if (lower.includes('permission') || lower.includes('access is denied') || lower.includes('os error 5')) {
    return 'Permessi di sistema Windows insufficienti per applicare l\'aggiornamento. Assicurati che l\'utente abbia i permessi necessari o esegui il programma come Amministratore.';
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return 'Server degli aggiornamenti raggiungibile ma nessun manifesto di versione rilasciato.';
  }
  if (lower.includes('corrupt') || lower.includes('checksum') || lower.includes('archive')) {
    return 'Il pacchetto scaricato risulta corrotto o incompleto. Riprova il download.';
  }
  return `Errore durante l'operazione di aggiornamento: ${msg}`;
}

/**
 * Verifica la disponibilità di una nuova versione di Autopia Manager interrogando
 * direttamente il sistema ufficiale Tauri v2 Updater.
 *
 * Se in ambiente desktop Tauri:
 * - Interroga l'endpoint configurato in tauri.conf.json (GitHub Releases latest.json)
 * - Verifica l'integrità e la firma crittografica con la chiave pubblica registrata
 * - Non reindirizza MAI a browser o pagine esterne
 */
export async function checkForAppUpdate(options?: {
  force?: boolean;
}): Promise<{
  updateAvailable: boolean;
  updateInfo: AppUpdateInfo | null;
  error: string | null;
}> {
  const now = Date.now();
  const lastCheck = getLastCheckTimestamp();
  const intervalMs = getCheckIntervalHours() * 60 * 60 * 1000;

  // Se è un controllo automatico in background, rispetta preferenze e intervallo temporale
  if (!options?.force) {
    if (!getAutoCheckPreference()) {
      return { updateAvailable: false, updateInfo: null, error: null };
    }
    if (now - lastCheck < intervalMs) {
      return { updateAvailable: false, updateInfo: null, error: null };
    }
  }

  localStorage.setItem(STORAGE_KEYS.LAST_CHECK, now.toString());
  const currentAppVer = await getRuntimeAppVersion();

  // 1. Controllo primario nativo con il plugin ufficiale Tauri v2 Updater
  if (isTauriEnvironment()) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update && update.available) {
        return {
          updateAvailable: true,
          updateInfo: {
            version: update.version,
            currentVersion: update.currentVersion || currentAppVer,
            releaseNotes: update.body || undefined,
            releaseDate: update.date || undefined,
            rawUpdate: update,
          },
          error: null,
        };
      }

      if (update && !update.available) {
        return { updateAvailable: false, updateInfo: null, error: null };
      }
    } catch (err: unknown) {
      const userMessage = translateUpdaterError(err);
      console.warn('[updaterService] Errore verifica Tauri Updater:', err);
      return {
        updateAvailable: false,
        updateInfo: null,
        error: userMessage,
      };
    }
  }

  // 2. Fallback per ambiente Web Dev Preview (simulazione controllo pulita)
  try {
    const res = await fetch('https://github.com/jacobs133/autopia-manager/releases/latest/download/latest.json', {
      cache: 'no-store',
    });
    if (res.ok) {
      const manifest = await res.json();
      const remoteVer = manifest?.version;
      if (remoteVer && isNewerVersion(remoteVer, currentAppVer)) {
        return {
          updateAvailable: true,
          updateInfo: {
            version: remoteVer,
            currentVersion: currentAppVer,
            releaseNotes: manifest.notes || `Nuova versione v${remoteVer} di Autopia Manager.`,
            releaseDate: manifest.pub_date || new Date().toISOString(),
            rawUpdate: null,
          },
          error: null,
        };
      }
    }
  } catch {
    // In dev preview silenziamo gli errori di rete se offline
  }

  return { updateAvailable: false, updateInfo: null, error: null };
}

/**
 * Confronta due stringhe SemVer (es. "0.3.9" > "0.3.8").
 */
export function isNewerVersion(remote: string, current: string): boolean {
  const pRemote = remote.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pCurrent = current.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(pRemote.length, pCurrent.length); i++) {
    const r = pRemote[i] || 0;
    const c = pCurrent[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Scarica, verifica la firma crittografica ed installa l'aggiornamento
 * direttamente dall'applicazione tramite l'Updater nativo di Tauri v2.
 *
 * Non apre MAI il browser e non rimanda MAI a file esterni da scaricare a mano.
 */
export async function downloadAndInstallAppUpdate(
  updateHandle: Update | null,
  onProgress: (progress: UpdateProgress) => void
): Promise<{ success: boolean; error: string | null }> {
  // Caso A: Ambiente desktop nativo Tauri con handle Update verificato
  if (isTauriEnvironment() && updateHandle) {
    try {
      let downloaded = 0;
      let contentLength = 0;

      onProgress({
        status: 'DOWNLOADING',
        percentage: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        stepMessage: 'Avvio download del pacchetto aggiornato...',
      });

      await updateHandle.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            onProgress({
              status: 'DOWNLOADING',
              percentage: 0,
              downloadedBytes: 0,
              totalBytes: contentLength,
              stepMessage: 'Download in corso...',
            });
            break;

          case 'Progress':
            downloaded += event.data.chunkLength;
            const pct = contentLength > 0
              ? Math.min(100, Math.round((downloaded / contentLength) * 100))
              : 50;
            onProgress({
              status: 'DOWNLOADING',
              percentage: pct,
              downloadedBytes: downloaded,
              totalBytes: contentLength,
              stepMessage: `Scaricamento: ${pct}% completato`,
            });
            break;

          case 'Finished':
            onProgress({
              status: 'INSTALLING',
              percentage: 100,
              downloadedBytes: downloaded,
              totalBytes: contentLength,
              stepMessage: 'Verifica firma crittografica ed installazione Windows in corso...',
            });
            break;
        }
      });

      // Installazione completata con successo
      onProgress({
        status: 'READY_TO_RELAUNCH',
        percentage: 100,
        downloadedBytes: downloaded,
        totalBytes: contentLength,
        stepMessage: 'Aggiornamento installato con successo! Riavvia l\'applicazione.',
      });

      return { success: true, error: null };
    } catch (err: unknown) {
      const userError = translateUpdaterError(err);
      console.error('[updaterService] Errore download e installazione:', err);
      onProgress({
        status: 'ERROR',
        percentage: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        errorMessage: userError,
      });
      return { success: false, error: userError };
    }
  }

  // Caso B: Ambiente Web Preview (simulazione UI per sviluppatori)
  if (!isTauriEnvironment()) {
    onProgress({
      status: 'DOWNLOADING',
      percentage: 25,
      downloadedBytes: 5000000,
      totalBytes: 20000000,
      stepMessage: 'Simulazione download ambiente Web Dev...',
    });
    await new Promise((r) => setTimeout(r, 600));
    onProgress({
      status: 'DOWNLOADING',
      percentage: 75,
      downloadedBytes: 15000000,
      totalBytes: 20000000,
      stepMessage: 'Simulazione download ambiente Web Dev...',
    });
    await new Promise((r) => setTimeout(r, 600));
    onProgress({
      status: 'INSTALLING',
      percentage: 100,
      downloadedBytes: 20000000,
      totalBytes: 20000000,
      stepMessage: 'Simulazione installazione pacchetto...',
    });
    await new Promise((r) => setTimeout(r, 500));
    onProgress({
      status: 'READY_TO_RELAUNCH',
      percentage: 100,
      downloadedBytes: 20000000,
      totalBytes: 20000000,
      stepMessage: 'Aggiornamento simulato pronto per il riavvio.',
    });
    return { success: true, error: null };
  }

  const noHandleError = 'Nessun handle di aggiornamento valido disponibile per l\'installazione.';
  onProgress({
    status: 'ERROR',
    percentage: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    errorMessage: noHandleError,
  });
  return { success: false, error: noHandleError };
}

/**
 * Riavvia Autopia Manager per eseguire immediatamente la nuova versione aggiornata.
 */
export async function relaunchApp(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('[updaterService] Errore durante il riavvio con tauri-plugin-process:', err);
    }
  } else {
    window.location.reload();
  }
}
