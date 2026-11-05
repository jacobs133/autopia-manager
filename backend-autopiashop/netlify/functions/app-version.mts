import type { Handler, HandlerEvent } from '@netlify/functions';
import { getCorsHeaders } from './ebay-shared.mts';

export const APP_LATEST_VERSION = '0.3.2';

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
    '• Risoluzione riconoscimento URL autorizzazione OAuth eBay (supporto auth_url)',
    '• Strumento diagnostico interattivo per la configurazione del canale eBay',
    '• Apertura diretta e fallback popup per eBay Sandbox',
    '• Integrazione completa eBay Sandbox (Fase 3A: OAuth 2.0 protetto)',
    '• Fase 3B: Pubblicazione annunci ricambi con codici OEM e foto',
    '• Fase 3B: Sincronizzazione automatica e istantanea delle giacenze',
    '• Fase 3C: Ricezione ordini eBay con scarico magazzino automatico',
    '• Fase 3C: Evasione ordini con invio del codice tracking (BRT, GLS, DHL, Poste, SDA)',
    '• Controllo aggiornamenti disponibile per tutti i demolitori direttamente dall\'app',
  ].join('\n');

  const manifest = {
    version: APP_LATEST_VERSION,
    notes: releaseNotes,
    pub_date: new Date().toISOString(),
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
