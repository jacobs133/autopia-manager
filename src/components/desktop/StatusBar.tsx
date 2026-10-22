import React, { useState, useEffect } from 'react';
import { Database, Laptop, Clock, AlertCircle } from 'lucide-react';
import { isTauriEnvironment } from '../../utils/tauriWindow';

interface StatusBarProps {
  backendConnected?: boolean;
  statusMessage?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  backendConnected = false,
  statusMessage = 'Backend Autopia non collegato (In attesa di credenziali autodemolitore)',
}) => {
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
              <span>Non configurato (Nessuna simulazione attiva)</span>
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <span className="text-slate-500 truncate max-w-md">{statusMessage}</span>
      </div>

      {/* Destra: Runtime, Versione e Orologio */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 text-slate-400">
          <Laptop className="w-3 h-3 text-slate-500" />
          <span>{isTauri ? 'Tauri 2.x • Windows' : 'Web Dev Preview'}</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <span className="text-slate-500 font-mono text-[10px]">v0.1.0-alpha</span>

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center space-x-1 text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{time}</span>
        </div>
      </div>
    </footer>
  );
};
