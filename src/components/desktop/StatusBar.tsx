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
}

export const StatusBar: React.FC<StatusBarProps> = ({
  backendConnected = false,
  statusMessage = 'Servizio non collegato',
  sellerBusinessName,
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
    <footer className="h-7 bg-white border-t border-[#E2E8E7] text-[#5C6B68] text-[11px] px-3.5 flex items-center justify-between select-none shrink-0 font-sans">
      {/* Sinistra: Stato servizio e sede attiva */}
      <div className="flex items-center gap-3 min-w-0">
        {backendConnected ? (
          <span className="inline-flex items-center gap-1.5 text-[#074E44] font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            <span>Sincronizzato</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium whitespace-nowrap">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Non connesso</span>
          </span>
        )}

        <span className="text-[#D7E0DE]" aria-hidden="true">|</span>

        <span className="truncate max-w-md text-[#5C6B68]">{statusMessage}</span>

        {sellerBusinessName && (
          <>
            <span className="text-[#D7E0DE] hidden sm:inline" aria-hidden="true">|</span>
            <span className="hidden sm:inline font-medium text-[#1A2322] truncate max-w-xs">
              {sellerBusinessName}
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
              className="inline-flex items-center gap-1 text-[#074E44] bg-[#EAF3F1] hover:bg-[#DCECE9] px-2 py-0.5 rounded-md border border-[#C6DFDA] font-semibold transition-colors cursor-pointer text-[10px]"
              title="Visualizza dettagli aggiornamento"
            >
              <DownloadCloud className="w-3 h-3 shrink-0" />
              <span>Aggiornamento v{updateInfo?.version}</span>
            </button>
            <span className="text-[#D7E0DE]" aria-hidden="true">|</span>
          </>
        )}

        {progress.status === 'DOWNLOADING' && (
          <>
            <span className="inline-flex items-center gap-1 text-[#074E44] font-mono tabular-nums text-[10px] font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Download {progress.percentage}%</span>
            </span>
            <span className="text-[#D7E0DE]" aria-hidden="true">|</span>
          </>
        )}

        {progress.status === 'READY_TO_RELAUNCH' && (
          <>
            <button
              type="button"
              onClick={relaunch}
              className="inline-flex items-center gap-1 text-white bg-[#074E44] hover:bg-[#053B33] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer text-[10px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Riavvia per aggiornare</span>
            </button>
            <span className="text-[#D7E0DE]" aria-hidden="true">|</span>
          </>
        )}

        <button
          type="button"
          onClick={openUpdateModal}
          className="text-[#5C6B68] hover:text-[#074E44] font-mono tabular-nums text-[10px] cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-[#F2F6F5]"
          title="Gestione aggiornamenti"
        >
          v{currentVersion}
        </button>

        <span className="text-[#D7E0DE]" aria-hidden="true">|</span>

        <span className="text-[#5C6B68] font-mono tabular-nums text-[10px]">{time}</span>
      </div>
    </footer>
  );
};
