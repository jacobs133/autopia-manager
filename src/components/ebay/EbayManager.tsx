import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Store,
  Layers,
  ArrowRight,
  Info,
  Building2,
  Unplug,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { EbayConnectionInfo } from '../../types/ebay';
import {
  fetchEbayConnectionStatus,
  initiateEbayOAuth,
  disconnectEbayAccount,
  getEbayOAuthBackendBaseUrl,
} from '../../services/ebayService';

export const EbayManager: React.FC = () => {
  const { user, sellerProfile, effectiveSellerProfile, isAdmin } = useAuth();
  const activeSeller = effectiveSellerProfile || sellerProfile;

  const [connectionInfo, setConnectionInfo] = useState<EbayConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showArchitectureDetails, setShowArchitectureDetails] = useState<boolean>(false);

  // Caricamento dello stato effettivo dal backend
  const loadStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setActionError(null);
    }
    const info = await fetchEbayConnectionStatus(activeSeller?.id);
    setConnectionInfo(info);
    setIsLoading(false);
  }, [activeSeller?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Avvio del collegamento OAuth con reindirizzamento al portale eBay Sandbox
  const handleConnect = async () => {
    setActionError(null);
    setActionNotice(null);
    setIsInitiating(true);

    try {
      const res = await initiateEbayOAuth();

      if (!res.success) {
        setActionError(res.error || 'Impossibile avviare il collegamento con eBay Sandbox.');
        setIsInitiating(false);
        return;
      }

      if (res.authorizationUrl) {
        setActionNotice(
          'Reindirizzamento in corso verso eBay Sandbox nel browser predefinito. Completa l\'accesso con il tuo account utente Sandbox di test.'
        );

        // Apertura sicura nel browser predefinito di sistema
        if (typeof window !== 'undefined') {
          const opened = window.open(res.authorizationUrl, '_blank', 'noopener,noreferrer');
          if (!opened) {
            // Se il popup viene bloccato, forniamo link diretto
            setActionNotice(
              `Il browser ha bloccato l'apertura automatica. Clicca sul link per aprire la pagina di consenso eBay Sandbox: ${res.authorizationUrl}`
            );
          }
        }

        // Ricarica lo stato dopo l'apertura del browser per rilevare eventuale completamento
        setTimeout(() => {
          loadStatus(true);
        }, 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eccezione imprevista durante l\'avvio di OAuth';
      setActionError(msg);
    } finally {
      setIsInitiating(false);
    }
  };

  // Disconnessione dell'account eBay
  const handleDisconnect = async () => {
    if (!window.confirm('Sei sicuro di voler scollegare l\'account eBay Sandbox da Autopia Manager?')) {
      return;
    }

    setIsDisconnecting(true);
    setActionError(null);
    setActionNotice(null);

    const res = await disconnectEbayAccount();
    if (!res.success) {
      setActionError(res.error || 'Errore durante la disconnessione dell\'account eBay.');
    } else {
      setActionNotice('Account eBay scollegato con successo.');
      await loadStatus();
    }
    setIsDisconnecting(false);
  };

  const isConnected = Boolean(connectionInfo?.isConnected);
  const backendUrl = getEbayOAuthBackendBaseUrl();

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6 font-sans select-text">
      {/* 1. Intestazione Modulo Canale eBay */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex items-center space-x-1">
              <Globe className="w-3 h-3 text-amber-400" />
              <span>Ambiente eBay Sandbox</span>
            </span>
            <span className="text-xs text-slate-500">FASE 3 • Collegamento Account</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1 flex items-center space-x-2.5">
            <span>Canale di Vendita eBay</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Connessione dell'account marketplace tramite autorizzazione protetta OAuth 2.0 (Zero-Trust Desktop).
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => loadStatus()}
            disabled={isLoading || isInitiating}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-lg text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Verifica lo stato aggiornato dal backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Aggiorna Stato</span>
          </button>
        </div>
      </div>

      {/* 2. Banner Feedback di Azione / Errore */}
      {actionError && (
        <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 flex items-start space-x-3 text-red-200 text-xs animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-red-300">Stato Operazione OAuth:</div>
            <p className="leading-relaxed text-red-200/90">{actionError}</p>
          </div>
        </div>
      )}

      {actionNotice && (
        <div className="bg-sky-950/40 border border-sky-800/80 rounded-xl p-4 flex items-start space-x-3 text-sky-200 text-xs animate-in fade-in duration-200">
          <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-sky-300">Notifica di Sistema:</div>
            <p className="leading-relaxed text-sky-200/90">{actionNotice}</p>
          </div>
        </div>
      )}

      {/* 3. Card Principale dello Stato di Connessione */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <Globe className="w-7 h-7 text-amber-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isConnected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                  }`}
                >
                  {isConnected ? 'COLLEGATO (SANDBOX)' : 'NON COLLEGATO'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ambiente: <strong className="text-slate-300 font-bold uppercase">Sandbox Test</strong>
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-100">
                {isConnected
                  ? `Account eBay: ${connectionInfo?.ebayUsername || 'Sconosciuto'}`
                  : 'Nessun account eBay Sandbox collegato'}
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                {isConnected
                  ? `L'account eBay Sandbox è stato autorizzato con successo per ${activeSeller?.business_name}. Il refresh token è custodito e cifrato sul server sicuro.`
                  : 'Per sincronizzare i ricambi del magazzino con eBay, collega il tuo account sviluppatore/utente di test tramite la procedura guidata OAuth 2.0.'}
              </p>

              {connectionInfo?.message && !isConnected && (
                <div className="text-[11px] text-slate-400 bg-slate-950/80 border border-slate-800/80 rounded px-2.5 py-1.5 font-mono">
                  Dettaglio backend: <span className="text-slate-300">{connectionInfo.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Azioni di Connessione / Disconnessione */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unplug className="w-4 h-4 text-red-400" />
                )}
                <span>Scollega Account eBay</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isInitiating || isLoading}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitiating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Contatto Backend OAuth...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 text-slate-950" />
                    <span>Collega account eBay (Sandbox)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Metadati Connessione Attiva */}
        {isConnected && connectionInfo && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Username eBay Sandbox</span>
              <span className="font-mono text-slate-200 font-semibold text-sm">
                {connectionInfo.ebayUsername || 'N/D'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Data Connessione</span>
              <span className="text-slate-300 font-medium">
                {connectionInfo.connectedAt
                  ? new Date(connectionInfo.connectedAt).toLocaleString('it-IT')
                  : 'N/D'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Permessi Autorizzati</span>
              <span className="font-mono text-emerald-400 text-[11px]">
                {connectionInfo.scopes.join(', ') || 'https://api.ebay.com/oauth/api_scope'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Box Spiegazione del Flusso Zero-Trust Desktop */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Architettura di Sicurezza Zero-Trust per l'Applicazione Desktop
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowArchitectureDetails(!showArchitectureDetails)}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            {showArchitectureDetails ? 'Nascondi Dettagli Tecnico-Operativi ▲' : 'Mostra Dettagli Tecnico-Operativi ▼'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-semibold text-amber-400 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Zero Segreti nel Desktop</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Il Client Secret (Cert ID) e il RuName risiedono solo nei secret serverless di Netlify. Nessun binario o file locale contiene credenziali private.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-semibold text-sky-400 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Protezione State Anti-CSRF</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Il parametro state è generato casualmente sul backend, associato a <code className="text-slate-300 font-mono">{activeSeller?.business_name || 'Demolitore'}</code> con scadenza a 10 minuti ed è rigorosamente monouso.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-semibold text-purple-400 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>3. Cifratura a Riposo AES-256</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              I refresh token scambiati da eBay vengono cifrati con algoritmo AES-256-GCM sul database Supabase e protetti da policy RLS inaccessibili al client.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Scope Minimo Identità</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              In questa fase è richiesto esclusivamente lo scope di base <code className="text-slate-300 font-mono">api_scope</code> per validare la connessione senza permessi di pubblicazione invasivi.
            </p>
          </div>
        </div>

        {/* Dettagli tecnici espandibili */}
        {showArchitectureDetails && (
          <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs animate-in fade-in duration-150">
            <div className="font-semibold text-slate-200">Stato di Configurazione Rilevato:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px] text-slate-400">
              <div>
                • Autodemolitore identificato: <span className="text-slate-200">{activeSeller?.business_name}</span> (ID: {activeSeller?.id})
              </div>
              <div>
                • Utente Supabase: <span className="text-slate-200">{user?.email}</span> (Ruolo: {isAdmin ? 'Master Admin' : 'Demolitore'})
              </div>
              <div>
                • Endpoint Backend OAuth: <span className="text-sky-300">{backendUrl}</span>
              </div>
              <div>
                • Ultimo controllo di rete: <span className="text-slate-300">{new Date(connectionInfo?.lastCheckedAt || Date.now()).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Sezioni Funzionali Future (Disabilitate in modo trasparente fino a completamento OAuth) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-400">
            Funzionalità Marketplace eBay (Pianificate per le Fasi 3B & 3C)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-2 opacity-65">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Fase 3B
              </span>
              <Store className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-sm font-bold text-slate-300">Pubblicazione Annunci Ricambi</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Invio automatico delle schede ricambio con foto, codici OEM e compatibilità veicoli sul marketplace eBay.
            </p>
            <div className="pt-2 text-[11px] text-amber-500/80 font-mono">
              In attesa del completamento OAuth
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-2 opacity-65">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Fase 3B
              </span>
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-sm font-bold text-slate-300">Sincronizzazione Giacenze Magazzino</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Lo scarico di un ricambio al banco in Autopia Manager decrementerà istantaneamente la quantità su eBay.
            </p>
            <div className="pt-2 text-[11px] text-amber-500/80 font-mono">
              In attesa del completamento OAuth
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-2 opacity-65">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Fase 3C
              </span>
              <Clock className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-sm font-bold text-slate-300">Ordini & Notifiche di Vendita</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ricezione degli ordini eBay direttamente nel gestionale desktop con avviso acustico e bolla di spedizione.
            </p>
            <div className="pt-2 text-[11px] text-amber-500/80 font-mono">
              In attesa del completamento OAuth
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
