import React, { useState, useEffect } from 'react';
import {
  Database,
  Laptop,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { isTauriEnvironment } from '../../utils/tauriWindow';
import { useUpdate } from '../../contexts/UpdateContext';

interface StatusBarProps {
  backendConnected?: boolean;
  statusMessage?: string;
  sellerBusinessName?: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  backendConnected = false,
  statusMessage = 'Backend Autopia non collegato',
  sellerBusinessName,
}) => {
  const { currentVersion, updateAvailable, updateInfo, progress, startInstall, relaunch, openUpdateModal } = useUpdate();
  const [time, setTime] = useState<string>('');
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-7 bg-slate-950 border-t border-slate-800 text-slate-400 text-[11px] px-3 flex items-center justify-between select-none shrink-0 font-sans">
      {/* Sinistra: Stato Connessione Reale */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <Database className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400">Backend Autopia:</span>
          {backendConnected ? (
            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connesso a Supabase</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-amber-400/90 font-medium">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Disconnesso / Da configurare</span>
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <span className="text-slate-500 truncate max-w-md">{statusMessage}</span>

        {sellerBusinessName && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <span className="text-amber-400/90 font-medium truncate max-w-xs">
              Azienda: {sellerBusinessName}
            </span>
          </>
        )}
      </div>

      {/* Destra: Runtime, Versione e Orologio */}
      <div className="flex items-center space-x-3">
        {/* Indicatore Aggiornamento Disponibile o in Corso */}
        {updateAvailable && (
          <>
            <button
              type="button"
              onClick={openUpdateModal}
              className="flex items-center space-x-1 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-medium transition-colors cursor-pointer text-[10px]"
              title="Visualizza dettagli aggiornamento"
            >
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Nuova v{updateInfo?.version} disponibile</span>
            </button>
            <div className="h-3 w-px bg-slate-800" />
          </>
        )}

        {progress.status === 'DOWNLOADING' && (
          <>
            <span className="flex items-center space-x-1 text-amber-300 font-mono text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              <span>Aggiornamento: {progress.percentage}%</span>
            </span>
            <div className="h-3 w-px bg-slate-800" />
          </>
        )}

        {progress.status === 'READY_TO_RELAUNCH' && (
          <>
            <button
              type="button"
              onClick={relaunch}
              className="flex items-center space-x-1 text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/80 font-bold transition-colors cursor-pointer text-[10px] animate-pulse"
            >
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>Riavvia per completare</span>
            </button>
            <div className="h-3 w-px bg-slate-800" />
          </>
        )}

        <div className="flex items-center space-x-1 text-slate-400">
          <Laptop className="w-3 h-3 text-slate-500" />
          <span>{isTauri ? 'Tauri 2.x • Windows' : 'Web Dev Preview'}</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <button
          type="button"
          onClick={openUpdateModal}
          className="text-slate-400 hover:text-amber-400 font-mono text-[10px] cursor-pointer transition-colors px-1 py-0.5 rounded hover:bg-slate-900"
          title="Gestione Aggiornamenti Software"
        >
          v{currentVersion}
        </button>

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center space-x-1 text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{time}</span>
        </div>
      </div>
    </footer>
  );
};
