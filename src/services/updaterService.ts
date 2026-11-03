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
  errorMessage?: string;
}

const LAST_CHECK_KEY = 'autopia_last_update_check_timestamp';
const AUTO_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 ore

/**
 * Rileva se l'applicazione sta girando all'interno dell'ambiente desktop Tauri compilato
 * oppure nell'ambiente web browser / dev server.
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

/**
 * Versione predefinita dell'applicazione definita nel client.
 */
export const APP_CURRENT_VERSION = '0.3.0';
let cachedAppVersion = APP_CURRENT_VERSION;

/**
 * Recupera la versione reale in esecuzione (tramite @tauri-apps/api/app se su desktop).
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
      // Fallback alla versione statica
    }
  }
  return cachedAppVersion;
}

/**
 * Verifica la disponibilità di una nuova versione di Autopia Manager.
 * In ambiente desktop Tauri v2 interroga l'endpoint ufficiale e convalida la firma crittografica.
 * In ambiente web di sviluppo/anteprima esegue una verifica sicura senza invocare API native Windows.
 */
export async function checkForAppUpdate(options?: {
  force?: boolean;
}): Promise<{
  updateAvailable: boolean;
  updateInfo: AppUpdateInfo | null;
  error: string | null;
}> {
  // Evita controlli automatici troppo ravvicinati se non forzati manualmente dall'utente
  const now = Date.now();
  const lastCheckStr = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;

  if (!options?.force && now - lastCheck < AUTO_CHECK_INTERVAL_MS) {
    return { updateAvailable: false, updateInfo: null, error: null };
  }

  localStorage.setItem(LAST_CHECK_KEY, now.toString());
  const currentAppVer = await getRuntimeAppVersion();

  // 1. Controllo nativo se siamo all'interno di Tauri Desktop
  if (isTauriEnvironment()) {
    try {
      // Importazione dinamica del plugin ufficiale Tauri v2
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (!update || !update.available) {
        return { updateAvailable: false, updateInfo: null, error: null };
      }

      const updateInfo: AppUpdateInfo = {
        version: update.version,
        currentVersion: update.currentVersion || currentAppVer,
        releaseNotes: update.body || undefined,
        releaseDate: update.date || undefined,
        rawUpdate: update,
      };

      return {
        updateAvailable: true,
        updateInfo,
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la verifica con Tauri Updater';
      console.warn('Avviso controllo aggiornamenti nativo Tauri:', msg);
      return { updateAvailable: false, updateInfo: null, error: msg };
    }
  }

  // 2. Controllo informativo in ambiente Web / Anteprima
  // Interroga il manifest pubblico per visualizzare lo stato senza scaricare binari Windows
  try {
    const manifestUrl = 'https://raw.githubusercontent.com/jacobs133/autopia-manager/main/src-tauri/tauri.conf.json';
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (response.ok) {
      const remoteConfig = await response.json();
      const remoteVer = remoteConfig.version;
      if (remoteVer && isNewerVersion(remoteVer, APP_CURRENT_VERSION)) {
        return {
          updateAvailable: true,
          updateInfo: {
            version: remoteVer,
            currentVersion: APP_CURRENT_VERSION,
            releaseNotes: 'Nuova versione ufficiale disponibile su GitHub Releases per Autopia Manager Windows.',
            releaseDate: new Date().toISOString(),
            rawUpdate: null,
          },
          error: null,
        };
      }
    }
  } catch {
    // Ignorato silenziosamente in caso di offline
  }

  return { updateAvailable: false, updateInfo: null, error: null };
}

/**
 * Confronta due stringhe di versione SemVer (es. "0.2.0" > "0.1.0").
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
 * Scarica e installa l'aggiornamento firmato, tracciando la percentuale di completamento.
 */
export async function downloadAndInstallAppUpdate(
  updateHandle: Update | null,
  onProgress: (progress: UpdateProgress) => void
): Promise<{ success: boolean; error: string | null }> {
  if (!isTauriEnvironment() || !updateHandle) {
    onProgress({
      status: 'ERROR',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      errorMessage: 'L\'installazione automatica dei pacchetti MSI/EXE è disponibile solo nell\'applicazione desktop Windows compilata.',
    });
    return {
      success: false,
      error: 'Aggiornamento nativo non disponibile in ambiente web di anteprima.',
    };
  }

  try {
    let downloaded = 0;
    let contentLength = 0;

    onProgress({
      status: 'DOWNLOADING',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
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
          });
          break;

        case 'Progress':
          downloaded += event.data.chunkLength;
          const pct = contentLength > 0 ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : 50;
          onProgress({
            status: 'DOWNLOADING',
            percentage: pct,
            downloadedBytes: downloaded,
            totalBytes: contentLength,
          });
          break;

        case 'Finished':
          onProgress({
            status: 'INSTALLING',
            percentage: 100,
            downloadedBytes: downloaded,
            totalBytes: contentLength,
          });
          break;
      }
    });

    onProgress({
      status: 'READY_TO_RELAUNCH',
      percentage: 100,
      downloadedBytes: downloaded,
      totalBytes: contentLength,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore durante il download o installazione dell\'aggiornamento';
    onProgress({
      status: 'ERROR',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      errorMessage: msg,
    });
    return { success: false, error: msg };
  }
}

/**
 * Riavvia l'applicazione desktop per applicare la nuova versione installata.
 */
export async function relaunchApp(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('Errore durante il riavvio con tauri-plugin-process:', err);
    }
  } else {
    window.location.reload();
  }
}
