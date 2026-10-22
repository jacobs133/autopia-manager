import React, { useState } from 'react';
import {
  LayoutDashboard,
  Car,
  Package,
  Store,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';

export type DesktopSection = 'dashboard' | 'vehicles' | 'parts' | 'listings' | 'import' | 'settings';

interface DesktopShellProps {
  children?: React.ReactNode;
  activeSection: DesktopSection;
  onSelectSection: (section: DesktopSection) => void;
  backendConnected?: boolean;
  statusMessage?: string;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  children,
  activeSection,
  onSelectSection,
  backendConnected = false,
  statusMessage,
}) => {
  const getSectionTitle = (sec: DesktopSection) => {
    switch (sec) {
      case 'dashboard':
        return 'Cruscotto Gestionale';
      case 'vehicles':
        return 'Parco Veicoli Demoliti';
      case 'parts':
        return 'Magazzino & Ricambi';
      case 'listings':
        return 'Annunci Marketplace Autopia';
      case 'import':
        return 'Importazione CSV Ricambi';
      case 'settings':
        return 'Connessione Backend & Autenticazione';
      default:
        return 'Autopia Manager';
    }
  };

  const navItems: { id: DesktopSection; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Cruscotto (Dashboard)', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vehicles', label: 'Veicoli Demoliti', icon: <Car className="w-4 h-4" /> },
    { id: 'parts', label: 'Magazzino & Ricambi', icon: <Package className="w-4 h-4" /> },
    { id: 'listings', label: 'Annunci Autopia Shop', icon: <Store className="w-4 h-4" /> },
    { id: 'import', label: 'Importazione CSV', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Connessione Backend', icon: <Settings className="w-4 h-4" />, badge: backendConnected ? undefined : 'Da impostare' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Barra del Titolo Desktop personalizzata per Windows */}
      <TitleBar currentSectionTitle={getSectionTitle(activeSection)} />

      {/* 2. Corpo principale con Sidebar laterale e Area di lavoro */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Barra di Navigazione Laterale */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
          <div className="p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
              Menu Gestionale
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Scheda Informativa Integrità e Marketplace */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Marketplace Collegato</span>
                <a
                  href="https://autopiashop.it"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center space-x-0.5 text-[10px]"
                >
                  <span>autopiashop.it</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Software riservato agli operatori del settore autodemolizione accreditati su Autopia.
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Nessuna chiave riservata archiviata nel client.</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Area di Lavoro Principale */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 3. Barra di Stato Desktop */}
      <StatusBar backendConnected={backendConnected} statusMessage={statusMessage} />
    </div>
  );
};
