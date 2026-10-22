/**
 * Utility per l'integrazione con la finestra nativa di Tauri 2 su Windows.
 * Include gestione trasparente del fallback in ambiente browser/anteprima.
 */

export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export async function minimizeCurrentWindow(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (err) {
      console.warn('Errore durante la minimizzazione della finestra Tauri:', err);
    }
  } else {
    console.info('[Desktop Web Fallback] Riduci a icona finestra (funzione nativa attiva nell\'app installata)');
  }
}

export async function toggleMaximizeCurrentWindow(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch (err) {
      console.warn('Errore durante l\'ingrandimento della finestra Tauri:', err);
    }
  } else {
    console.info('[Desktop Web Fallback] Ingrandisci/Ripristina finestra (funzione nativa attiva nell\'app installata)');
  }
}

export async function closeCurrentWindow(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (err) {
      console.warn('Errore durante la chiusura della finestra Tauri:', err);
    }
  } else {
    console.info('[Desktop Web Fallback] Chiusura finestra (funzione nativa attiva nell\'app installata)');
  }
}
