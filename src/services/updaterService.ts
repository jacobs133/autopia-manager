import type { Update } from '@tauri-apps/plugin-updater';
import { openExternalUrl } from './externalLinkService';

export interface AppUpdateInfo {
  version: string;
  currentVersion: string;
  releaseNotes?: string;
  releaseDate?: string;
  downloadUrl?: string;
  releaseUrl?: string;
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
export const APP_CURRENT_VERSION = '0.3.8';
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
 * Verifica la disponibilità di una nuova versione di Autopia Manager interrogando
 * in sequenza tutti i canali ufficiali:
 * 1. Plugin nativo Tauri v2 Updater (convalida crittografica se disponibile)
 * 2. Netlify Functions (https://autopiashop.it/.netlify/functions/app-version)
 * 3. GitHub Releases API (https://api.github.com/repos/jacobs133/autopia-manager/releases/latest)
 * 4. Manifest raw su GitHub repository
 */
export async function checkForAppUpdate(options?: {
  force?: boolean;
}): Promise<{
  updateAvailable: boolean;
  updateInfo: AppUpdateInfo | null;
  error: string | null;
}> {
  const now = Date.now();
  const lastCheckStr = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;

  if (!options?.force && now - lastCheck < AUTO_CHECK_INTERVAL_MS) {
    return { updateAvailable: false, updateInfo: null, error: null };
  }

  localStorage.setItem(LAST_CHECK_KEY, now.toString());
  const currentAppVer = await getRuntimeAppVersion();
  const endpointErrors: string[] = [];

  // 1. Controllo nativo tramite plugin Tauri Updater (se in ambiente desktop)
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
            downloadUrl: `https://github.com/jacobs133/autopia-manager/releases/download/v${update.version}/Autopia-Manager-Setup.exe`,
            releaseUrl: `https://github.com/jacobs133/autopia-manager/releases/tag/v${update.version}`,
            rawUpdate: update,
          },
          error: null,
        };
      }

      if (update && !update.available) {
        return { updateAvailable: false, updateInfo: null, error: null };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      endpointErrors.push(`Tauri Updater: ${msg}`);
    }
  }

  // 2. Controllo tramite endpoint server Netlify su autopiashop.it
  try {
    const netlifyRes = await fetch('https://autopiashop.it/.netlify/functions/app-version', {
      cache: 'no-store',
    });
    if (netlifyRes.ok) {
      const manifest = await netlifyRes.json();
      const remoteVer = manifest?.version;
      if (remoteVer && isNewerVersion(remoteVer, currentAppVer)) {
        return {
          updateAvailable: true,
          updateInfo: {
            version: remoteVer,
            currentVersion: currentAppVer,
            releaseNotes: manifest.notes || `Nuova versione v${remoteVer} di Autopia Manager disponibile.`,
            releaseDate: manifest.pub_date || new Date().toISOString(),
            downloadUrl: manifest.download_url || `https://github.com/jacobs133/autopia-manager/releases/download/v${remoteVer}/Autopia-Manager-Setup.exe`,
            releaseUrl: manifest.release_url || `https://github.com/jacobs133/autopia-manager/releases/tag/v${remoteVer}`,
            rawUpdate: null,
          },
          error: null,
        };
      } else if (remoteVer) {
        return { updateAvailable: false, updateInfo: null, error: null };
      }
    } else {
      endpointErrors.push(`Netlify app-version: HTTP ${netlifyRes.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    endpointErrors.push(`Netlify app-version: ${msg}`);
  }

  // 3. Controllo tramite GitHub Releases API pubblica
  try {
    const ghRes = await fetch('https://api.github.com/repos/jacobs133/autopia-manager/releases/latest', {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (ghRes.ok) {
      const release = await ghRes.json();
      const rawTag = release.tag_name || release.name || '';
      const remoteVer = rawTag.replace(/^v/, '').trim();

      if (remoteVer && isNewerVersion(remoteVer, currentAppVer)) {
        // Cerca installer .exe negli assets della release
        const setupAsset = release.assets?.find(
          (a: any) => a.name?.endsWith('.exe') || a.name?.includes('Setup')
        );
        const downloadUrl = setupAsset?.browser_download_url || `https://github.com/jacobs133/autopia-manager/releases/download/v${remoteVer}/Autopia-Manager-Setup.exe`;

        return {
          updateAvailable: true,
          updateInfo: {
            version: remoteVer,
            currentVersion: currentAppVer,
            releaseNotes: release.body || `Nuova versione v${remoteVer} pubblicata su GitHub.`,
            releaseDate: release.published_at || new Date().toISOString(),
            downloadUrl,
            releaseUrl: release.html_url || `https://github.com/jacobs133/autopia-manager/releases/tag/v${remoteVer}`,
            rawUpdate: null,
          },
          error: null,
        };
      } else if (remoteVer) {
        return { updateAvailable: false, updateInfo: null, error: null };
      }
    } else {
      endpointErrors.push(`GitHub API: HTTP ${ghRes.status} (repository privato o inesistente)`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    endpointErrors.push(`GitHub API: ${msg}`);
  }

  // 4. Controllo tramite latest.json su GitHub
  try {
    const latestJsonRes = await fetch('https://github.com/jacobs133/autopia-manager/releases/latest/download/latest.json', {
      cache: 'no-store',
    });
    if (latestJsonRes.ok) {
      const manifest = await latestJsonRes.json();
      const remoteVer = manifest?.version;
      if (remoteVer && isNewerVersion(remoteVer, currentAppVer)) {
        return {
          updateAvailable: true,
          updateInfo: {
            version: remoteVer,
            currentVersion: currentAppVer,
            releaseNotes: manifest.notes,
            releaseDate: manifest.pub_date,
            downloadUrl: manifest.platforms?.['windows-x86_64']?.url || `https://github.com/jacobs133/autopia-manager/releases/download/v${remoteVer}/Autopia-Manager-Setup.exe`,
            releaseUrl: `https://github.com/jacobs133/autopia-manager/releases/tag/v${remoteVer}`,
            rawUpdate: null,
          },
          error: null,
        };
      } else if (remoteVer) {
        return { updateAvailable: false, updateInfo: null, error: null };
      }
    } else {
      endpointErrors.push(`GitHub latest.json: HTTP ${latestJsonRes.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    endpointErrors.push(`GitHub latest.json: ${msg}`);
  }

  // Se è un controllo manuale forzato dall'utente e tutti gli endpoint hanno fallito con 404,
  // informiamo chiaramente l'utente sul motivo (repository privato / Netlify non sincronizzato)
  if (options?.force) {
    const has404 = endpointErrors.some((e) => e.includes('404'));
    if (has404) {
      return {
        updateAvailable: false,
        updateInfo: null,
        error: `I canali di aggiornamento ufficiali non hanno restituito release pubbliche (Netlify e GitHub restituiscono 404). Il repository GitHub 'jacobs133/autopia-manager' risulta privato. Per consentire la ricerca e il download automatico da tutti i PC, imposta il repository come "Public" nelle impostazioni di GitHub.`,
      };
    }
    return {
      updateAvailable: false,
      updateInfo: null,
      error: `Impossibile verificare gli aggiornamenti: ${endpointErrors.join('; ')}`,
    };
  }

  return { updateAvailable: false, updateInfo: null, error: null };
}

/**
 * Confronta due stringhe di versione SemVer (es. "0.3.2" > "0.3.1").
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
 * Scarica e installa l'aggiornamento.
 * - Se rawUpdate nativo di Tauri v2 è disponibile: scarica e valida la firma crittografica.
 * - Se rawUpdate è null (fallback manifest / no-sign): apre il download diretto dell'installer
 *   e guida l'utente al completamento immediato.
 */
export async function downloadAndInstallAppUpdate(
  updateHandle: Update | null,
  onProgress: (progress: UpdateProgress) => void,
  fallbackDownloadUrl?: string
): Promise<{ success: boolean; error: string | null }> {
  // Caso A: Aggiornamento nativo Tauri v2 con firma digitale verificata
  if (isTauriEnvironment() && updateHandle) {
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
      const msg = err instanceof Error ? err.message : 'Errore durante il download dell\'aggiornamento';
      console.warn('Download nativo non riuscito (es. firma o pacchetto non sincronizzato), fallback al download diretto dell\'installer Setup.exe:', msg);

      // Invece di interrompere con errore, avviamo il download diretto dell'installer
      try {
        const targetUrl =
          fallbackDownloadUrl ||
          'https://github.com/jacobs133/autopia-manager/releases/latest/download/Autopia-Manager-Setup.exe';

        onProgress({
          status: 'DOWNLOADING',
          percentage: 80,
          downloadedBytes: 0,
          totalBytes: 0,
        });

        await openExternalUrl(targetUrl);

        onProgress({
          status: 'READY_TO_RELAUNCH',
          percentage: 100,
          downloadedBytes: 0,
          totalBytes: 0,
        });

        return { success: true, error: null };
      } catch (fallbackErr: unknown) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : msg;
        onProgress({
          status: 'ERROR',
          percentage: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          errorMessage: `Download automatico fallito (${fallbackMsg}). Usa il pulsante "Download Ultimo Setup (.exe)" per aggiornare.`,
        });
        return { success: false, error: fallbackMsg };
      }
    }
  }

  // Caso B: Fallback manifest o download diretto dell'installer Autopia-Manager-Setup.exe
  const targetUrl =
    fallbackDownloadUrl ||
    'https://github.com/jacobs133/autopia-manager/releases/latest/download/Autopia-Manager-Setup.exe';

  onProgress({
    status: 'DOWNLOADING',
    percentage: 50,
    downloadedBytes: 0,
    totalBytes: 0,
  });

  try {
    await openExternalUrl(targetUrl);

    onProgress({
      status: 'READY_TO_RELAUNCH',
      percentage: 100,
      downloadedBytes: 0,
      totalBytes: 0,
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Impossibile avviare il download dell\'installer';
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
