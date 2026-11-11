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
  RefreshCw,
  HardDrive,
  Calendar,
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
    lastCheckSummary,
    checkForUpdates,
    startInstall,
    relaunch,
    closeUpdateModal,
    postponeUpdate,
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
  const isUpToDate = progress.status === 'UP_TO_DATE' && !updateAvailable;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modale */}
        <div className="p-6 bg-gradient-to-b from-amber-500/10 via-slate-900/60 to-slate-900 border-b border-slate-800/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                {isReadyToRelaunch ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : isDownloading || isInstalling ? (
                  <DownloadCloud className="w-6 h-6 text-amber-400 animate-bounce" />
                ) : (
                  <Sparkles className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Aggiornamento Integrato Ufficiale</span>
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-1">
                  {isReadyToRelaunch
                    ? 'Aggiornamento Completato'
                    : isDownloading
                    ? 'Download Aggiornamento in Corso'
                    : isInstalling
                    ? 'Installazione Aggiornamento in Corso'
                    : updateAvailable
                    ? 'Nuova Versione di Autopia Manager'
                    : isChecking
                    ? 'Verifica Aggiornamenti in Corso'
                    : isError
                    ? 'Stato Verifica Aggiornamenti'
                    : 'Autopia Manager è Aggiornato'}
                </h2>
              </div>
            </div>

            {!isDownloading && !isInstalling && !isReadyToRelaunch && (
              <button
                type="button"
                onClick={closeUpdateModal}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Chiudi finestra"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Confronto Versione Installata vs Nuova Versione */}
          <div className="mt-4 flex items-center space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Versione Attuale</span>
              <span className="font-mono font-bold text-slate-200">v{currentVersion}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="flex-1 text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Versione Disponibile</span>
              {updateAvailable && updateInfo ? (
                <span className="font-mono font-bold text-emerald-400">v{updateInfo.version}</span>
              ) : isChecking ? (
                <span className="text-amber-400 font-semibold flex items-center justify-end space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifica...</span>
                </span>
              ) : (
                <span className="font-semibold text-emerald-400">All'ultima versione (v{currentVersion})</span>
              )}
            </div>
          </div>
        </div>

        {/* Corpo Modale */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* STATO 1: Pronto per il Riavvio */}
          {isReadyToRelaunch && (
            <div className="p-5 bg-emerald-950/50 border border-emerald-800/80 rounded-xl space-y-3 text-xs text-emerald-200">
              <div className="flex items-center space-x-2 font-bold text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Aggiornamento installato con successo!</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                I nuovi file dell'applicazione sono stati installati. Fai clic sul pulsante sottostante per riavviare Autopia Manager ed eseguire subito la nuova versione.
              </p>
              <div className="p-2.5 bg-slate-950/80 rounded border border-emerald-900/60 text-[11px] text-slate-400 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Le credenziali, l'inventario, le inserzioni e i dati del magazzino rimangono completamente conservati.</span>
              </div>
            </div>
          )}

          {/* STATO 2: Download o Installazione in corso */}
          {(isDownloading || isInstalling) && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>
                      {isDownloading
                        ? 'Scaricamento pacchetto aggiornamento...'
                        : 'Verifica firma crittografica ed installazione in corso...'}
                    </span>
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{progress.percentage}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{progress.stepMessage || 'Operazione in background'}</span>
                  {progress.totalBytes > 0 && (
                    <span className="font-mono">
                      {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[11px] text-amber-300 flex items-start space-x-2">
                <HardDrive className="w-4 h-4 shrink-0 mt-0.5" />
                <span>L'operazione avviene in modo trasparente e automatico. Non chiudere Autopia Manager fino al completamento.</span>
              </div>
            </div>
          )}

          {/* STATO 3: Aggiornamento Disponibile (In attesa della conferma dell'utente) */}
          {!isDownloading && !isInstalling && !isReadyToRelaunch && updateAvailable && updateInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/70 rounded-xl space-y-1.5 text-xs text-emerald-300">
                <div className="font-bold flex items-center justify-between text-emerald-400">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Autopia Manager v{updateInfo.version}</span>
                  </div>
                  {formatDate(updateInfo.releaseDate) && (
                    <span className="text-[10px] text-slate-400 font-normal flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{formatDate(updateInfo.releaseDate)}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  L'aggiornamento viene scaricato, verificato crittograficamente e installato direttamente dall'applicazione in un clic, senza scaricare file manualmente.
                </p>
              </div>

              {/* Note di Rilascio */}
              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Novità di questa versione:
                  </label>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-line font-sans">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {/* Box di Garanzia e Sicurezza */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Installazione Sicura Windows:</strong> Verifica della firma Minisign Ed25519 e conservazione completa di login, configurazioni, ricambi e dati Supabase.
                </span>
              </div>
            </div>
          )}

          {/* STATO 4: Verifica in Corso */}
          {!isDownloading && !isInstalling && !isReadyToRelaunch && !updateAvailable && isChecking && (
            <div className="p-8 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-400" />
              <div className="text-xs font-semibold text-slate-200">
                Verifica aggiornamenti in corso...
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Interrogazione del canale ufficiale di rilascio di Autopia Manager.
              </p>
            </div>
          )}

          {/* STATO 5: Applicazione Aggiornata */}
          {!isDownloading && !isInstalling && !isReadyToRelaunch && !updateAvailable && !isChecking && !isError && (
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Autopia Manager è aggiornato all'ultima versione</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Sul tuo computer è attualmente in esecuzione la versione <strong>v{currentVersion}</strong>. Non sono presenti aggiornamenti da installare.
              </p>
              {lastCheckSummary && (
                <div className="text-[10px] text-slate-500 font-mono bg-slate-900 p-2.5 rounded border border-slate-800/80">
                  {lastCheckSummary}
                </div>
              )}
            </div>
          )}

          {/* STATO 6: Errore durante la verifica o l'installazione */}
          {isError && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="font-bold text-red-300">Operazione non riuscita</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  {progress.errorMessage || lastCheckSummary || 'Si è verificato un errore durante la comunicazione con il server degli aggiornamenti.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Azioni */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {/* Azione 1: Quando l'aggiornamento è pronto per il riavvio */}
          {isReadyToRelaunch ? (
            <button
              type="button"
              onClick={relaunch}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Riavvia Autopia Manager Ora</span>
            </button>
          ) : isDownloading || isInstalling ? (
            /* Azione 2: Durante il download / installazione */
            <div className="w-full text-center text-xs text-slate-400 py-1 flex items-center justify-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Installazione in corso. L'applicazione si riavvierà al termine.</span>
            </div>
          ) : updateAvailable && updateInfo ? (
            /* Azione 3: Quando è disponibile una nuova versione */
            <>
              <button
                type="button"
                onClick={postponeUpdate}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Più tardi
              </button>

              <button
                type="button"
                onClick={startInstall}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Aggiorna Ora (In-App)</span>
              </button>
            </>
          ) : (
            /* Azione 4: Quando l'app è aggiornata o c'è stato un errore */
            <>
              <button
                type="button"
                onClick={() => checkForUpdates(true)}
                disabled={isChecking}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isChecking ? 'Controllo in corso...' : 'Verifica Aggiornamenti Ora'}</span>
              </button>

              <button
                type="button"
                onClick={closeUpdateModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Chiudi
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
