import React from 'react';
import { Minus, Square, X, Search } from 'lucide-react';
import {
  minimizeCurrentWindow,
  toggleMaximizeCurrentWindow,
  closeCurrentWindow,
} from '../../utils/tauriWindow';

interface TitleBarProps {
  currentSectionTitle?: string;
  sellerName?: string | null;
  onOpenCommandPalette?: () => void;
  canSearch?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentSectionTitle = 'Centro Operativo',
  sellerName,
  onOpenCommandPalette,
  canSearch = false,
}) => {
  return (
    <header
      data-tauri-drag-region
      className="h-9 bg-[#0F1615] border-b border-[#22302E] text-[#E6EEEC] flex items-center justify-between select-none pl-3.5 pr-0 z-50 text-xs font-sans shrink-0"
    >
      {/* Identità compatta e percorso modulo */}
      <div className="flex items-center gap-2.5 pointer-events-none min-w-0">
        <div className="w-5 h-5 rounded-md bg-[#0A6256] border border-[#198575]/60 text-white flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-3 h-3"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 17H4a2 2 0 0 1-2-2v-3.5a2 2 0 0 1 .6-1.4l2.1-2.1A2 2 0 0 1 6.1 7.4h7.3a2 2 0 0 1 1.6.8l2 2.6h2.2a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-1" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>
        <span className="font-bold text-[12px] tracking-tight text-[#F3F7F6] whitespace-nowrap">
          Autopia Manager
        </span>
        <span className="text-[#455A56]" aria-hidden="true">/</span>
        <span className="text-[#A8BDB8] font-medium truncate">{currentSectionTitle}</span>
        {sellerName && (
          <>
            <span className="text-[#455A56] hidden md:inline" aria-hidden="true">·</span>
            <span className="text-[#5EEAD4] font-medium truncate max-w-[200px] hidden md:inline">
              {sellerName}
            </span>
          </>
        )}
      </div>

      {/* Centro: Trigger Ricerca Rapida Desktop */}
      {canSearch && onOpenCommandPalette && (
        <div className="hidden lg:flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="h-6 px-3 bg-[#182321] hover:bg-[#1F2D2A] border border-[#2A3B38] rounded-md text-[11px] text-[#9BB0AB] hover:text-[#EAF3F1] flex items-center gap-2 transition-colors cursor-pointer"
            title="Ricerca rapida globale (Ctrl+K)"
          >
            <Search className="w-3 h-3 text-[#5EEAD4]" />
            <span>Ricerca globale o comandi...</span>
            <kbd className="font-mono text-[10px] text-[#7D948F] bg-[#101817] border border-[#253532] px-1.5 rounded">
              Ctrl K
            </kbd>
          </button>
        </div>
      )}

      {/* Destra: Controlli Finestra Windows */}
      <div className="flex items-center h-full shrink-0">
        <button
          type="button"
          onClick={minimizeCurrentWindow}
          title="Riduci a icona"
          className="h-9 w-11 flex items-center justify-center text-[#9BB0AB] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleMaximizeCurrentWindow}
          title="Ingrandisci o ripristina"
          className="h-9 w-11 flex items-center justify-center text-[#9BB0AB] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={closeCurrentWindow}
          title="Chiudi"
          className="h-9 w-11 flex items-center justify-center text-[#9BB0AB] hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
