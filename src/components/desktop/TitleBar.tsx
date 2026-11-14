import React from 'react';
import { Car, Minus, Square, X } from 'lucide-react';
import {
  minimizeCurrentWindow,
  toggleMaximizeCurrentWindow,
  closeCurrentWindow,
} from '../../utils/tauriWindow';

interface TitleBarProps {
  currentSectionTitle?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ currentSectionTitle = 'Dashboard' }) => {
  return (
    <header
      data-tauri-drag-region
      className="h-9 bg-white border-b border-[#E2E8E7] text-[#1A2322] flex items-center justify-between select-none pl-3.5 pr-0 z-50 text-xs font-sans shrink-0"
    >
      {/* Sezione Sinistra: Identità compatta e sezione corrente */}
      <div className="flex items-center gap-2.5 pointer-events-none min-w-0">
        <div className="w-5 h-5 rounded-md bg-[#074E44] text-white flex items-center justify-center shrink-0">
          <Car className="w-3 h-3" strokeWidth={2.2} />
        </div>
        <span className="font-bold text-[12px] tracking-tight text-[#162220] whitespace-nowrap">
          Autopia Manager
        </span>
        <span className="text-[#C5D0CE]" aria-hidden="true">/</span>
        <span className="text-[#5C6B68] font-medium truncate">{currentSectionTitle}</span>
      </div>

      {/* Sezione Destra: Controlli Finestra Windows */}
      <div className="flex items-center h-full shrink-0">
        <button
          type="button"
          onClick={minimizeCurrentWindow}
          title="Riduci a icona"
          className="h-9 w-11 flex items-center justify-center text-[#5C6B68] hover:text-[#1A2322] hover:bg-[#EDF2F1] transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleMaximizeCurrentWindow}
          title="Ingrandisci o ripristina"
          className="h-9 w-11 flex items-center justify-center text-[#5C6B68] hover:text-[#1A2322] hover:bg-[#EDF2F1] transition-colors cursor-pointer"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={closeCurrentWindow}
          title="Chiudi"
          className="h-9 w-11 flex items-center justify-center text-[#5C6B68] hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
