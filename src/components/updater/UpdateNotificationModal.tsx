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
} from 'lucide-react';
import { useUpdate } from '../../contexts/UpdateContext';

export const UpdateNotificationModal: React.FC = () => {
  const {
    updateAvailable,
    updateInfo,
    progress,
    isDismissed,
    isTauri,
    startInstall,
    relaunch,
    postponeUpdate,
  } = useUpdate();

  if (!updateAvailable || !updateInfo || isDismissed) {
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                    <span>Aggiornamento Software Disponibile</span>
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-100 mt-1">
                  Nuova versione di Autopia Manager
                </h2>
              </div>
            </div>

            {!isDownloading && !isInstalling && !isReadyToRelaunch && (
              <button
                type="button"
                onClick={postponeUpdate}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Posticipa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Confronto Versioni */}
          <div className="mt-4 flex items-center space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Versione Attuale</span>
              <span className="font-mono font-bold text-slate-300">v{updateInfo.currentVersion}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 text-right">
              <span className="text-[10px] text-emerald-400 block uppercase font-semibold">Nuova Versione</span>
              <span className="font-mono font-bold text-emerald-400">v{updateInfo.version}</span>
            </div>
          </div>
        </div>

        {/* Corpo: Note di Rilascio & Stato */}
        <div className="p-6 space-y-4">
          {/* Note di rilascio se presenti */}
          {updateInfo.releaseNotes && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Novità e Migliorie:
              </label>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-line font-sans">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Garanzia Crittografica e Separazione Dati */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Verifica di Firma Crittografica Ufficiale Autopia</span>
            </div>
            <p className="leading-relaxed">
              L'aggiornamento aggiorna esclusivamente l'eseguibile del programma. Tutte le sessioni, le impostazioni locali e i dati di magazzino rimangono intatti e sincronizzati con il database Supabase.
            </p>
          </div>

          {/* Barra di Avanzamento Download */}
          {(isDownloading || isInstalling) && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 flex items-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>
                    {isDownloading ? 'Download pacchetto firmato in corso...' : 'Installazione aggiornamento...'}
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

          {/* Stato Completato / Pronto per il Riavvio */}
          {isReadyToRelaunch && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-2 text-xs text-emerald-300">
              <div className="flex items-center space-x-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Aggiornamento completato con successo!</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                L'applicazione è pronta per essere riavviata con la nuova versione <strong>v{updateInfo.version}</strong>. Nessun dato locale o impostazione verrà persa.
              </p>
            </div>
          )}

          {/* Errore */}
          {isError && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-300">Impossibile completare l'aggiornamento</div>
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
                onClick={postponeUpdate}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {isError ? <X className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                <span>{isError ? 'Chiudi' : 'Ricordamelo più tardi'}</span>
              </button>

              <button
                type="button"
                onClick={startInstall}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-amber-500/10 flex items-center space-x-2 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>{isError ? 'Riprova Download' : 'Scarica & Installa Ora'}</span>
              </button>
            </>
          ) : isReadyToRelaunch ? (
            <button
              type="button"
              onClick={relaunch}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Riavvia Applicazione Ora</span>
            </button>
          ) : (
            <div className="w-full text-center text-xs text-slate-400 py-1 flex items-center justify-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Non chiudere l'applicazione durante l'operazione...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
