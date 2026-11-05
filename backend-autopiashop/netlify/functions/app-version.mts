import type { Handler, HandlerEvent } from '@netlify/functions';
import { getCorsHeaders } from './ebay-shared.mts';

export const APP_LATEST_VERSION = '0.3.3';

/**
 * Endpoint pubblico per il controllo degli aggiornamenti software di Autopia Manager.
 * Restituisce il manifest compatibile con Tauri v2 Updater e le informazioni di versione.
 * Non richiede credenziali GitHub, garantendo che tutti i PC dei demolitori possano
 * verificare la presenza di nuove versioni in modo affidabile e istantaneo.
 */
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

  // Permette di leggere la versione target anche dal query param o default
  const releaseNotes = [
    '• Apertura nativa e affidabile del portale eBay Sandbox nel browser predefinito di Windows (bypass popup blocker WebView2)',
    '• Pulsante "Copia Link di Accesso" e verifica periodica automatica del completamento OAuth',
    '• Supporto multi-canale aggiornamenti (GitHub Releases + Netlify + latest.json)',
    '• Integrazione completa eBay Sandbox (Fase 3A: OAuth 2.0 protetto)',
    '• Fase 3B: Pubblicazione annunci ricambi con codici OEM e foto',
    '• Fase 3B: Sincronizzazione automatica e istantanea delle giacenze',
    '• Fase 3C: Ricezione ordini eBay con scarico magazzino automatico',
    '• Fase 3C: Evasione ordini con invio del codice tracking (BRT, GLS, DHL, Poste, SDA)',
    '• Auto-update per tutti i demolitori direttamente dall\'app Windows',
  ].join('\n');

  const manifest = {
    version: APP_LATEST_VERSION,
    notes: releaseNotes,
    pub_date: new Date().toISOString(),
    download_url: 'https://github.com/jacobs133/autopia-manager/releases/latest/download/Autopia-Manager-Setup.exe',
    release_url: `https://github.com/jacobs133/autopia-manager/releases/tag/v${APP_LATEST_VERSION}`,
    platforms: {
      'windows-x86_64': {
        signature: '',
        url: 'https://github.com/jacobs133/autopia-manager/releases/latest/download/Autopia-Manager-Setup.exe',
      },
      'windows-i686': {
        signature: '',
        url: 'https://github.com/jacobs133/autopia-manager/releases/latest/download/Autopia-Manager-Setup.exe',
      },
    },
  };

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: JSON.stringify(manifest),
  };
};
