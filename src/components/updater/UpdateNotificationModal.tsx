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
import { AlertBanner, Button, StatusBadge } from '../ui/DesignSystem';

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
    <div className="fixed inset-0 z-50 bg-[#10201E]/45 backdrop-blur-[2px] flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-white border border-[#E2E8E7] rounded-2xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col">
        {/* Header Modale */}
        <div className="p-5 border-b border-[#E2E8E7] bg-[#FAFBFB] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#EAF3F1] text-[#074E44] flex items-center justify-center shrink-0">
                {isReadyToRelaunch ? (
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488]" />
                ) : isDownloading || isInstalling ? (
                  <DownloadCloud className="w-5 h-5" />
                ) : (
                  <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                )}
              </div>
              <div>
                <StatusBadge tone="brand">Aggiornamento Software</StatusBadge>
                <h2 className="text-base font-bold text-[#1A2322] mt-1">
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
                className="text-[#5C6B68] hover:text-[#1A2322] p-1.5 rounded-lg hover:bg-[#EDF2F1] transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Confronto Versione */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#E2E8E7] text-xs">
            <div className="flex-1">
              <span className="text-[11px] text-[#5C6B68] block font-medium">Versione installata</span>
              <span className="font-mono tabular-nums font-bold text-[#1A2322]">v{currentVersion}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#93A3A0] shrink-0" />
            <div className="flex-1 text-right">
              <span className="text-[11px] text-[#5C6B68] block font-medium">Versione disponibile</span>
              {updateAvailable && updateInfo ? (
                <span className="font-mono tabular-nums font-bold text-[#074E44]">v{updateInfo.version}</span>
              ) : isChecking ? (
                <span className="text-[#074E44] font-semibold inline-flex items-center justify-end gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifica...</span>
                </span>
              ) : (
                <span className="font-semibold text-[#0D9488] tabular-nums">v{currentVersion} (attuale)</span>
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
              <div className="p-3 bg-[#F7FAF9] rounded-xl border border-[#E2E8E7] text-xs text-[#5C6B68] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#074E44] shrink-0" />
                <span>Credenziali, magazzino e configurazioni restano invariati.</span>
              </div>
            </div>
          )}

          {(isDownloading || isInstalling) && (
            <div className="space-y-3">
              <div className="p-4 bg-[#F7FAF9] rounded-xl border border-[#E2E8E7] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#1A2322] flex items-center gap-2">
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

                <div className="w-full bg-[#DCE6E4] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#074E44] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5C6B68]">
                  <span>{progress.stepMessage || 'Operazione in corso'}</span>
                  {progress.totalBytes > 0 && (
                    <span className="font-mono tabular-nums">
                      {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#FAFBFB] border border-[#E2E8E7] rounded-xl text-xs text-[#5C6B68] flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-[#074E44] shrink-0 mt-0.5" />
                <span>Non chiudere l'applicazione fino al completamento dell'operazione.</span>
              </div>
            </div>
          )}

          {!isDownloading && !isInstalling && !isReadyToRelaunch && updateAvailable && updateInfo && (
            <div className="space-y-3.5">
              <div className="p-4 bg-[#EAF3F1]/60 border border-[#C6DFDA] rounded-xl space-y-1.5">
                <div className="font-bold text-xs flex items-center justify-between text-[#074E44]">
                  <span>Autopia Manager v{updateInfo.version}</span>
                  {formatDate(updateInfo.releaseDate) && (
                    <span className="text-[11px] text-[#5C6B68] font-normal flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(updateInfo.releaseDate)}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#374845] leading-relaxed">
                  L'aggiornamento verrà scaricato, verificato e installato automaticamente senza file esterni.
                </p>
              </div>

              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2E3C3A] block">
                    Novità di questa versione
                  </label>
                  <div className="bg-[#F7FAF9] p-3.5 rounded-xl border border-[#E2E8E7] text-xs text-[#374845] max-h-36 overflow-y-auto leading-relaxed whitespace-pre-line">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#FAFBFB] rounded-xl border border-[#E2E8E7] flex items-start gap-2 text-xs text-[#5C6B68]">
                <ShieldCheck className="w-4 h-4 text-[#074E44] shrink-0 mt-0.5" />
                <span>
                  Verifica crittografica automatica della firma e conservazione completa dei dati locali.
                </span>
              </div>
            </div>
          )}

          {!isDownloading && !isInstalling && !isReadyToRelaunch && !updateAvailable && isChecking && (
            <div className="p-8 bg-[#F7FAF9] rounded-xl border border-[#E2E8E7] text-center space-y-2.5">
              <Loader2 className="w-7 h-7 mx-auto animate-spin text-[#074E44]" />
              <div className="text-xs font-semibold text-[#1A2322]">
                Ricerca nuovi aggiornamenti...
              </div>
              <p className="text-xs text-[#5C6B68]">
                Controllo della versione più recente in corso.
              </p>
            </div>
          )}

          {!isDownloading && !isInstalling && !isReadyToRelaunch && !updateAvailable && !isChecking && !isError && (
            <div className="p-4 bg-[#F7FAF9] rounded-xl border border-[#E2E8E7] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#074E44] font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                <span>Stai già usando l'ultima versione disponibile</span>
              </div>
              <p className="text-[#5C6B68] leading-relaxed">
                Versione attualmente installata: <strong className="font-mono text-[#1A2322]">v{currentVersion}</strong>.
              </p>
              {lastCheckSummary && (
                <div className="text-[11px] text-[#5C6B68] bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
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
        <div className="px-5 py-3.5 bg-[#FAFBFB] border-t border-[#E2E8E7] flex items-center justify-between gap-2">
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
            <div className="w-full text-center text-xs text-[#5C6B68] py-1 flex items-center justify-center gap-2">
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
