import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  DownloadCloud,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useUpdate } from '../../contexts/UpdateContext';

interface StatusBarProps {
  backendConnected?: boolean;
  statusMessage?: string;
  sellerBusinessName?: string | null;
  lastSyncAt?: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  backendConnected = false,
  statusMessage = 'Servizio non collegato',
  sellerBusinessName,
  lastSyncAt,
}) => {
  const { currentVersion, updateAvailable, updateInfo, progress, relaunch, openUpdateModal } = useUpdate();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-7 bg-[#0F1615] border-t border-[#22302E] text-[#9BB0AB] text-[11px] px-3.5 flex items-center justify-between select-none shrink-0 font-sans">
      {/* Sinistra: Stato collegamento e sede operativa */}
      <div className="flex items-center gap-3 min-w-0">
        {backendConnected ? (
          <span className="inline-flex items-center gap-1.5 text-[#5EEAD4] font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
            <span>Connesso</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-medium whitespace-nowrap">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Non connesso</span>
          </span>
        )}

        <span className="text-[#2D3E3B]" aria-hidden="true">|</span>

        <span className="truncate max-w-md text-[#A6B8B3]">{statusMessage}</span>

        {sellerBusinessName && (
          <>
            <span className="text-[#2D3E3B] hidden sm:inline" aria-hidden="true">|</span>
            <span className="hidden sm:inline font-semibold text-[#EDF3F1] truncate max-w-xs">
              {sellerBusinessName}
            </span>
          </>
        )}

        {lastSyncAt && (
          <>
            <span className="text-[#2D3E3B] hidden lg:inline" aria-hidden="true">|</span>
            <span className="hidden lg:inline text-[10px] font-mono tabular-nums text-[#7C918C]">
              Agg. {new Date(lastSyncAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
      </div>

      {/* Destra: Aggiornamenti, versione e orario */}
      <div className="flex items-center gap-3 shrink-0">
        {updateAvailable && progress.status !== 'DOWNLOADING' && progress.status !== 'READY_TO_RELAUNCH' && (
          <>
            <button
              type="button"
              onClick={openUpdateModal}
              className="inline-flex items-center gap-1 text-[#0F1615] bg-[#5EEAD4] hover:bg-[#2DD4BF] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer text-[10px]"
              title="Visualizza dettagli aggiornamento"
            >
              <DownloadCloud className="w-3 h-3 shrink-0" />
              <span>Aggiornamento v{updateInfo?.version}</span>
            </button>
            <span className="text-[#2D3E3B]" aria-hidden="true">|</span>
          </>
        )}

        {progress.status === 'DOWNLOADING' && (
          <>
            <span className="inline-flex items-center gap-1 text-[#5EEAD4] font-mono tabular-nums text-[10px] font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Download {progress.percentage}%</span>
            </span>
            <span className="text-[#2D3E3B]" aria-hidden="true">|</span>
          </>
        )}

        {progress.status === 'READY_TO_RELAUNCH' && (
          <>
            <button
              type="button"
              onClick={relaunch}
              className="inline-flex items-center gap-1 text-white bg-[#0D9488] hover:bg-[#0F766E] px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer text-[10px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Riavvia per aggiornare</span>
            </button>
            <span className="text-[#2D3E3B]" aria-hidden="true">|</span>
          </>
        )}

        <button
          type="button"
          onClick={openUpdateModal}
          className="text-[#9BB0AB] hover:text-[#5EEAD4] font-mono tabular-nums text-[10px] cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
          title="Gestione aggiornamenti desktop"
        >
          v{currentVersion}
        </button>

        <span className="text-[#2D3E3B]" aria-hidden="true">|</span>

        <span className="text-[#9BB0AB] font-mono tabular-nums text-[10px]">{time}</span>
      </div>
    </footer>
  );
};
