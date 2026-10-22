import React, { useState, useEffect } from 'react';
import { Wrench, Minus, Square, X, Monitor, ShieldCheck } from 'lucide-react';
import { isTauriEnvironment, minimizeCurrentWindow, toggleMaximizeCurrentWindow, closeCurrentWindow } from '../../utils/tauriWindow';

interface TitleBarProps {
  currentSectionTitle?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ currentSectionTitle = 'Dashboard' }) => {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  return (
    <header
      data-tauri-drag-region
      className="h-10 bg-slate-900 border-b border-slate-800 text-slate-200 flex items-center justify-between select-none px-3 z-50 text-xs font-sans shrink-0"
    >
      {/* Sezione Sinistra: Icona, Titolo Applicazione e Titolo Vista Attiva */}
      <div className="flex items-center space-x-3 pointer-events-none">
        <div className="flex items-center space-x-1.5 font-bold tracking-wider text-amber-400">
          <div className="w-5 h-5 bg-amber-500/20 border border-amber-500/40 rounded flex items-center justify-center text-amber-400">
            <Wrench className="w-3 h-3" />
          </div>
          <span className="uppercase text-[11px] font-black tracking-widest text-slate-100">
            AUTOPIA <span className="text-amber-400 font-extrabold">MANAGER</span>
          </span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center space-x-1 text-slate-400">
          <span>{currentSectionTitle}</span>
        </div>
      </div>

      {/* Sezione Centrale: Indicatore Ambiente Desktop */}
      <div className="flex items-center space-x-2 pointer-events-none">
        {isTauri ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>Tauri 2 • Desktop Windows Nativo</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">
            <Monitor className="w-2.5 h-2.5" />
            <span>Ambiente di Sviluppo Web (AI Studio)</span>
          </span>
        )}
      </div>

      {/* Sezione Destra: Controlli Finestra Windows */}
      <div className="flex items-center -mr-3 h-full">
        <button
          type="button"
          onClick={minimizeCurrentWindow}
          title="Riduci a icona"
          className="h-10 w-11 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleMaximizeCurrentWindow}
          title="Ingrandisci / Ripristina"
          className="h-10 w-11 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={closeCurrentWindow}
          title="Chiudi"
          className="h-10 w-12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
