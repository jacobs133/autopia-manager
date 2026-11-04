import React from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Clock,
  RefreshCw,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useUpdate } from '../../contexts/UpdateContext';

export const UpdateNotificationModal: React.FC = () => {
  const {
    isChecking,
    updateAvailable,
    updateInfo,
    currentVersion,
    progress,
    isDismissed,
    isModalOpen,
    isTauri,
    lastCheckSummary,
    checkForUpdates,
    startInstall,
    relaunch,
    closeUpdateModal,
  } = useUpdate();

  // Mostra la modale se esplicitamente aperta dall'utente oppure se rilevato un aggiornamento automatico non posticipato
  const shouldShow = isModalOpen || (updateAvailable && updateInfo && !isDismissed);

  if (!shouldShow) {
    return null;
  }

  const isDownloading = progress.status === 'DOWNLOADING';
  const isInstalling = progress.status === 'INSTALLING';
  const isReadyToRelaunch = progress.status === 'READY_TO_RELAUNCH';
  const isError = progress.status === 'ERROR';

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header Modale */}
        <div className="p-6 bg-gradient-to-b from-amber-500/10 via-slate-900/60 to-slate-900 border-b border-slate-800/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <DownloadCloud className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Gestione Aggiornamenti Software</span>
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-1">
                  Autopia Manager Desktop
                </h2>
              </div>
            </div>

            {!isDownloading && !isInstalling && !isReadyToRelaunch && (
              <button
                type="button"
                onClick={closeUpdateModal}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Versione Attuale vs Nuova */}
          <div className="mt-4 flex items-center space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Versione Installata</span>
              <span className="font-mono font-bold text-slate-200">v{currentVersion}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="flex-1 text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Stato Canale Ufficiale</span>
              {updateAvailable && updateInfo ? (
                <span className="font-mono font-bold text-emerald-400 animate-pulse">v{updateInfo.version} (Nuova)</span>
              ) : isChecking ? (
                <span className="text-amber-400 font-semibold flex items-center justify-end space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifica...</span>
                </span>
              ) : (
                <span className="font-semibold text-emerald-400">All'ultima versione</span>
              )}
            </div>
          </div>
        </div>

        {/* Corpo Modale */}
        <div className="p-6 space-y-4">
          {/* Caso 1: Aggiornamento Disponibile */}
          {updateAvailable && updateInfo ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl space-y-1 text-xs text-emerald-300">
                <div className="font-bold flex items-center space-x-1.5 text-emerald-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Nuova versione v{updateInfo.version} pronta per l'installazione diretta</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Puoi aggiornare l'applicazione con un solo clic. Tutti i dati, i ricambi e il login rimangono al sicuro su Supabase.
                </p>
              </div>

              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Novità di questa versione:
                  </label>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-line font-sans">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}
            </div>
          ) : isChecking ? (
            /* Caso 2: Controllo in Corso */
            <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-400" />
              <div className="text-xs font-semibold text-slate-200">
                Verifica aggiornamenti in corso...
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Controllo del manifest di versione su autopiashop.it e GitHub Releases.
              </p>
            </div>
          ) : (
            /* Caso 3: Nessun Aggiornamento / Già all'ultima versione */
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Autopia Manager è aggiornato all'ultima versione</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Sul tuo computer è installata la versione <strong>v{currentVersion}</strong>. Non ci sono nuovi aggiornamenti da scaricare.
              </p>
              {lastCheckSummary && (
                <div className="text-[10px] text-slate-500 font-mono bg-slate-900 p-2 rounded border border-slate-800/80">
                  {lastCheckSummary}
                </div>
              )}
            </div>
          )}

          {/* Barra di Avanzamento Download */}
          {(isDownloading || isInstalling) && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 flex items-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>
                    {isDownloading ? 'Scaricamento pacchetto aggiornato...' : 'Installazione in corso...'}
                  </span>
                </span>
                <span className="font-mono text-amber-400">{progress.percentage}%</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {progress.totalBytes > 0 && (
                <div className="text-[10px] text-slate-500 font-mono text-right">
                  {formatBytes(progress.downloadedBytes)} su {formatBytes(progress.totalBytes)}
                </div>
              )}
            </div>
          )}

          {/* Pronto per il Riavvio */}
          {isReadyToRelaunch && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-2 text-xs text-emerald-300">
              <div className="flex items-center space-x-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Aggiornamento completato con successo!</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                L'applicazione è pronta per essere riavviata. Clicca su "Riavvia Applicazione" per applicare subito i cambiamenti.
              </p>
            </div>
          )}

          {/* Errore */}
          {isError && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-300">Stato Controllo</div>
                <div className="mt-0.5 text-slate-300 text-[11px]">{progress.errorMessage}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Azioni */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {!isDownloading && !isInstalling && !isReadyToRelaunch ? (
            <>
              <button
                type="button"
                onClick={() => checkForUpdates(true)}
                disabled={isChecking}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isChecking ? 'Verifica in corso...' : 'Verifica Nuova Versione'}</span>
              </button>

              {updateAvailable ? (
                <button
                  type="button"
                  onClick={startInstall}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-amber-500/10 flex items-center space-x-2 cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Scarica & Aggiorna Ora</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
              )}
            </>
          ) : isReadyToRelaunch ? (
            <button
              type="button"
              onClick={relaunch}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer animate-pulse"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Riavvia Applicazione Ora</span>
            </button>
          ) : (
            <div className="w-full text-center text-xs text-slate-400 py-1 flex items-center justify-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Aggiornamento in corso. Non chiudere il programma...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
