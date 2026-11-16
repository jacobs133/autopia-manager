import React from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  RotateCcw,
  X,
  ArrowRight,
  ShieldCheck,
  Loader2,
  RefreshCw,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { useUpdate } from '../../contexts/UpdateContext';
import { AlertBanner, Button } from '../ui/DesignSystem';

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
    <div className="fixed inset-0 z-50 bg-[#0F1615]/60 backdrop-blur-[2px] flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-white border border-[#DCE4E2] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modale Scura */}
        <div className="p-5 border-b border-[#253331] bg-[#121B1A] text-white space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0A6256]/40 border border-[#198575]/40 text-[#5EEAD4] flex items-center justify-center shrink-0">
                {isReadyToRelaunch ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isDownloading || isInstalling ? (
                  <DownloadCloud className="w-5 h-5" />
                ) : (
                  <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                )}
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#5EEAD4]">
                  Aggiornamento Desktop Tauri
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {isReadyToRelaunch
                    ? 'Aggiornamento completato'
                    : isDownloading
                    ? 'Download aggiornamento in corso'
                    : isInstalling
                    ? 'Installazione in corso'
                    : updateAvailable
                    ? 'Nuova versione disponibile'
                    : isChecking
                    ? 'Verifica aggiornamenti in corso'
                    : isError
                    ? 'Verifica aggiornamenti non riuscita'
                    : 'Autopia Manager è aggiornato'}
                </h2>
              </div>
            </div>

            {!isDownloading && !isInstalling && !isReadyToRelaunch && (
              <button
                type="button"
                onClick={closeUpdateModal}
                className="text-[#9AB0AC] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Confronto Versione */}
          <div className="flex items-center gap-3 bg-[#1A2624] p-3 rounded-xl border border-[#2A3B38] text-xs">
            <div className="flex-1">
              <span className="text-[11px] text-[#9AB0AC] block font-medium">Versione installata</span>
              <span className="font-mono tabular-nums font-bold text-white">v{currentVersion}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#5EEAD4] shrink-0" />
            <div className="flex-1 text-right">
              <span className="text-[11px] text-[#9AB0AC] block font-medium">Versione disponibile</span>
              {updateAvailable && updateInfo ? (
                <span className="font-mono tabular-nums font-bold text-[#5EEAD4]">v{updateInfo.version}</span>
              ) : isChecking ? (
                <span className="text-[#5EEAD4] font-semibold inline-flex items-center justify-end gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifica...</span>
                </span>
              ) : (
                <span className="font-semibold font-mono text-[#5EEAD4] tabular-nums">
                  v{currentVersion} (attuale)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Corpo Modale */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {isReadyToRelaunch && (
            <div className="space-y-3">
              <AlertBanner tone="success" title="Aggiornamento installato">
                I nuovi file sono stati applicati. Riavvia Autopia Manager per iniziare a usare la nuova versione.
              </AlertBanner>
              <div className="p-3 bg-[#F6F8F8] rounded-xl border border-[#E1E8E6] text-xs text-[#566663] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#074E44] shrink-0" />
                <span>Credenziali, magazzino e configurazioni restano invariati.</span>
              </div>
            </div>
          )}

          {(isDownloading || isInstalling) && (
            <div className="space-y-3">
              <div className="p-4 bg-[#F6F8F8] rounded-xl border border-[#E1E8E6] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#131C1B] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#074E44]" />
                    <span>
                      {isDownloading
                        ? 'Download del pacchetto...'
                        : 'Verifica ed installazione in corso...'}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-[#074E44] font-bold">
                    {progress.percentage}%
                  </span>
                </div>

                <div className="w-full bg-[#DCE4E2] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#074E44] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#566663]">
                  <span>{progress.stepMessage || 'Operazione in corso'}</span>
                  {progress.totalBytes > 0 && (
                    <span className="font-mono tabular-nums">
                      {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#F6F8F8] border border-[#E1E8E6] rounded-xl text-xs text-[#566663] flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-[#074E44] shrink-0 mt-0.5" />
                <span>Non chiudere l&apos;applicazione fino al completamento dell&apos;operazione.</span>
              </div>
            </div>
          )}

          {!isDownloading && !isInstalling && !isReadyToRelaunch && updateAvailable && updateInfo && (
            <div className="space-y-3.5">
              <div className="p-4 bg-[#EAF3F1]/70 border border-[#C6DFDA] rounded-xl space-y-1.5">
                <div className="font-bold text-xs flex items-center justify-between text-[#074E44]">
                  <span>Autopia Manager v{updateInfo.version}</span>
                  {formatDate(updateInfo.releaseDate) && (
                    <span className="text-[11px] text-[#566663] font-normal flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(updateInfo.releaseDate)}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#374845] leading-relaxed">
                  L&apos;aggiornamento verrà scaricato, verificato crittograficamente e installato automaticamente in modalità passiva.
                </p>
              </div>

              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#334441] block">
                    Novità di questa versione
                  </label>
                  <div className="bg-[#F6F8F8] p-3.5 rounded-xl border border-[#E1E8E6] text-xs text-[#374845] max-h-36 overflow-y-auto leading-relaxed whitespace-pre-line">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#F6F8F8] rounded-xl border border-[#E1E8E6] flex items-start gap-2 text-xs text-[#566663]">
                <ShieldCheck className="w-4 h-4 text-[#074E44] shrink-0 mt-0.5" />
                <span>
                  Verifica crittografica automatica Minisign Ed25519 e conservazione completa dei dati locali.
                </span>
              </div>
            </div>
          )}

          {!isDownloading && !isInstalling && !isReadyToRelaunch && !updateAvailable && isChecking && (
            <div className="p-8 bg-[#F6F8F8] rounded-xl border border-[#E1E8E6] text-center space-y-2.5">
              <Loader2 className="w-7 h-7 mx-auto animate-spin text-[#074E44]" />
              <div className="text-xs font-semibold text-[#131C1B]">
                Ricerca nuovi aggiornamenti...
              </div>
              <p className="text-xs text-[#566663]">
                Controllo della versione più recente in corso.
              </p>
            </div>
          )}

          {!isDownloading && !isInstalling && !isReadyToRelaunch && !updateAvailable && !isChecking && !isError && (
            <div className="p-4 bg-[#F6F8F8] rounded-xl border border-[#E1E8E6] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#074E44] font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                <span>Stai già usando l&apos;ultima versione disponibile</span>
              </div>
              <p className="text-[#566663] leading-relaxed">
                Versione attualmente installata: <strong className="font-mono text-[#131C1B]">v{currentVersion}</strong>.
              </p>
              {lastCheckSummary && (
                <div className="text-[11px] text-[#566663] bg-white p-2.5 rounded-lg border border-[#DCE4E2]">
                  {lastCheckSummary}
                </div>
              )}
            </div>
          )}

          {isError && (
            <AlertBanner tone="danger" title="Operazione non riuscita">
              {progress.errorMessage || lastCheckSummary || 'Errore durante la verifica degli aggiornamenti.'}
            </AlertBanner>
          )}
        </div>

        {/* Footer Azioni */}
        <div className="px-5 py-3.5 bg-[#F6F8F8] border-t border-[#DCE4E2] flex items-center justify-between gap-2">
          {isReadyToRelaunch ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={relaunch}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Riavvia Autopia Manager</span>
            </Button>
          ) : isDownloading || isInstalling ? (
            <div className="w-full text-center text-xs text-[#566663] py-1 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#074E44]" />
              <span>Installazione automatica in corso...</span>
            </div>
          ) : updateAvailable && updateInfo ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={postponeUpdate}>
                Più tardi
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={startInstall}>
                <DownloadCloud className="w-4 h-4" />
                <span>Aggiorna ora</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={isChecking}
                onClick={() => checkForUpdates(true)}
                disabled={isChecking}
              >
                {!isChecking && <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isChecking ? 'Controllo...' : 'Verifica aggiornamenti'}</span>
              </Button>

              <Button type="button" variant="primary" size="sm" onClick={closeUpdateModal}>
                Chiudi
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
