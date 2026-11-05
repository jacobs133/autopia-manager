/**
 * Servizio per l'apertura affidabile di collegamenti esterni (browser predefinito dell'utente).
 * Gestisce sia l'ambiente desktop nativo Tauri v2 su Windows (bypassando i blocchi popup di WebView2),
 * sia l'ambiente web / dev server.
 */

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

/**
 * Apre un URL esterno nel browser predefinito di sistema (es. Chrome, Edge, Firefox).
 * Utilizza in sequenza:
 * 1. Comando Rust nativo Tauri `open_external_url` (ignora i popup blocker di WebView2)
 * 2. `window.open(url, '_blank')`
 * 3. Elemento <a> programmatico
 */
export async function openExternalUrl(url: string): Promise<{ success: boolean; method: string }> {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { success: false, method: 'none' };
  }

  const cleanUrl = url.trim();

  // 1. Se siamo all'interno dell'ambiente desktop Tauri compilato
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url: cleanUrl });
      return { success: true, method: 'tauri-native' };
    } catch (tauriErr) {
      console.warn('Invocazione tauri open_external_url non riuscita, passaggio ai fallback:', tauriErr);
    }
  }

  // 2. Tentativo con window.open standard
  try {
    if (typeof window !== 'undefined') {
      const popup = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      if (popup) {
        return { success: true, method: 'window-open' };
      }
    }
  } catch (winErr) {
    console.warn('window.open bloccato dal browser:', winErr);
  }

  // 3. Fallback tramite anchor cliccato programmaticamente
  try {
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = cleanUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true, method: 'dom-anchor' };
    }
  } catch (domErr) {
    console.warn('Fallback anchor non riuscito:', domErr);
  }

  return { success: false, method: 'blocked' };
}

/**
 * Copia un URL negli appunti dell'utente con fallback sicuro.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard API non disponibile, uso textarea fallback:', e);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Impossibile copiare negli appunti:', err);
    return false;
  }
}
