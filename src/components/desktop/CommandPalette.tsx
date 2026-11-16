import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Car,
  Package,
  ShoppingBag,
  Store,
  FileSpreadsheet,
  Globe,
  ShieldCheck,
  Settings,
  RefreshCw,
  ArrowRight,
  X,
} from 'lucide-react';
import type { DashboardSnapshot } from '../../services/dashboardService';
import type { DesktopSection } from './DesktopShell';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: DashboardSnapshot | null;
  isAdmin: boolean;
  onSelectSection: (section: DesktopSection) => void;
  onCheckUpdates: () => void;
  onRefreshData: () => void;
}

interface PaletteEntry {
  id: string;
  group: 'Navigazione' | 'Azioni' | 'Magazzino Ricambi' | 'Veicoli Piazzale' | 'Ordini';
  title: string;
  subtitle: string;
  badge?: string;
  icon: React.ReactNode;
  execute: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  snapshot,
  isAdmin,
  onSelectSection,
  onCheckUpdates,
  onRefreshData,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    const navCommands: PaletteEntry[] = [
      {
        id: 'nav-dashboard',
        group: 'Navigazione',
        title: 'Centro Operativo & Dashboard',
        subtitle: 'Panoramica KPI, statistiche magazzino e attività recente',
        icon: <LayoutDashboard className="w-4 h-4" />,
        execute: () => onSelectSection('dashboard'),
      },
      {
        id: 'nav-vehicles',
        group: 'Navigazione',
        title: 'Veicoli in Demolizione',
        subtitle: 'Gestione parco veicoli, targhe, telai VIN ed estrazione ricambi',
        icon: <Car className="w-4 h-4" />,
        execute: () => onSelectSection('vehicles'),
      },
      {
        id: 'nav-parts',
        group: 'Navigazione',
        title: 'Magazzino & Scaffalature',
        subtitle: 'Catalogo ricambi, codici OEM, giacenze, prezzi ed export CSV',
        icon: <Package className="w-4 h-4" />,
        execute: () => onSelectSection('parts'),
      },
      {
        id: 'nav-orders',
        group: 'Navigazione',
        title: 'Ordini & Richieste Acquisto',
        subtitle: 'Conferme disponibilità, spedizioni e tracking corrieri',
        icon: <ShoppingBag className="w-4 h-4" />,
        execute: () => onSelectSection('orders'),
      },
      {
        id: 'nav-listings',
        group: 'Navigazione',
        title: 'Annunci Autopia Shop',
        subtitle: 'Controllo vetrina online e scarico rapido al banco',
        icon: <Store className="w-4 h-4" />,
        execute: () => onSelectSection('listings'),
      },
      {
        id: 'nav-import',
        group: 'Navigazione',
        title: 'Importazione Massiva CSV',
        subtitle: 'Caricamento guidato con validazione automatica righe',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        execute: () => onSelectSection('import'),
      },
      {
        id: 'nav-ebay',
        group: 'Navigazione',
        title: 'Canale Vendita eBay',
        subtitle: 'Sincronizzazione inserzioni e ordini eBay',
        icon: <Globe className="w-4 h-4" />,
        execute: () => onSelectSection('ebay'),
      },
    ];

    if (isAdmin) {
      navCommands.push(
        {
          id: 'nav-admin',
          group: 'Navigazione',
          title: 'Amministrazione Piattaforma',
          subtitle: 'Gestione rete autodemolitori, approvazioni e verifica stati',
          icon: <ShieldCheck className="w-4 h-4" />,
          execute: () => onSelectSection('admin'),
        },
        {
          id: 'nav-settings',
          group: 'Navigazione',
          title: 'Impostazioni & Server',
          subtitle: 'Configurazione Supabase e diagnostica desktop',
          icon: <Settings className="w-4 h-4" />,
          execute: () => onSelectSection('settings'),
        }
      );
    }

    const quickActions: PaletteEntry[] = [
      {
        id: 'act-refresh',
        group: 'Azioni',
        title: 'Aggiorna dati operativi ora',
        subtitle: 'Ricarica KPI magazzino, ordini e notifiche da Supabase',
        icon: <RefreshCw className="w-4 h-4" />,
        execute: onRefreshData,
      },
      {
        id: 'act-updates',
        group: 'Azioni',
        title: 'Verifica aggiornamenti software',
        subtitle: 'Controlla la disponibilità di nuove versioni Autopia Manager',
        icon: <RefreshCw className="w-4 h-4" />,
        execute: onCheckUpdates,
      },
    ];

    // Se query vuota: mostra navigazione + azioni + primi risultati recenti
    if (!q) {
      return [...navCommands, ...quickActions];
    }

    for (const cmd of [...navCommands, ...quickActions]) {
      if (
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle.toLowerCase().includes(q)
      ) {
        list.push(cmd);
      }
    }

    if (snapshot) {
      // Ricerca ricambi (titolo, OEM, interno, posizione)
      const matchedParts = snapshot.searchable.parts
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.oem_code && p.oem_code.toLowerCase().includes(q)) ||
            (p.internal_code && p.internal_code.toLowerCase().includes(q)) ||
            (p.position_note && p.position_note.toLowerCase().includes(q))
        )
        .slice(0, 7);

      for (const p of matchedParts) {
        list.push({
          id: `part-${p.id}`,
          group: 'Magazzino Ricambi',
          title: p.title,
          subtitle: `${p.oem_code ? `OEM ${p.oem_code}` : 'Senza OEM'}${
            p.position_note ? ` · ${p.position_note}` : ''
          } · ${p.quantity} pz`,
          badge: p.price > 0 ? `€ ${p.price.toFixed(2)}` : 'Bozza',
          icon: <Package className="w-4 h-4" />,
          execute: () => onSelectSection('parts'),
        });
      }

      // Ricerca veicoli
      const matchedVehicles = snapshot.searchable.vehicles
        .filter(
          (v) =>
            v.make.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            (v.plate && v.plate.toLowerCase().includes(q)) ||
            (v.vin && v.vin.toLowerCase().includes(q))
        )
        .slice(0, 5);

      for (const v of matchedVehicles) {
        list.push({
          id: `veh-${v.id}`,
          group: 'Veicoli Piazzale',
          title: `${v.make} ${v.model}${v.year ? ` (${v.year})` : ''}`,
          subtitle: `${v.plate ? `Targa ${v.plate}` : 'Senza targa'}${
            v.vin ? ` · VIN ${v.vin}` : ''
          }`,
          badge: v.status,
          icon: <Car className="w-4 h-4" />,
          execute: () => onSelectSection('vehicles'),
        });
      }

      // Ricerca ordini
      const matchedOrders = snapshot.searchable.orders
        .filter(
          (o) =>
            (o.order_number && o.order_number.toLowerCase().includes(q)) ||
            o.id.toLowerCase().includes(q)
        )
        .slice(0, 5);

      for (const o of matchedOrders) {
        list.push({
          id: `ord-${o.id}`,
          group: 'Ordini',
          title: `Ordine #${o.order_number || o.id.slice(0, 8)}`,
          subtitle: `${new Date(o.created_at).toLocaleDateString('it-IT')} · Stato: ${o.fulfillment_status}`,
          badge: `€ ${o.total.toFixed(2)}`,
          icon: <ShoppingBag className="w-4 h-4" />,
          execute: () => onSelectSection('orders'),
        });
      }
    }

    return list;
  }, [query, snapshot, isAdmin, onSelectSection, onCheckUpdates, onRefreshData]);

  useEffect(() => {
    setActiveIndex(0);
  }, [entries.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (entries.length > 0 ? (prev + 1) % entries.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          entries.length > 0 ? (prev - 1 + entries.length) % entries.length : 0
        );
      } else if (e.key === 'Enter' && entries[activeIndex]) {
        e.preventDefault();
        entries[activeIndex].execute();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, entries, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F1615]/60 backdrop-blur-[2px] flex items-start justify-center pt-20 px-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#CFDAD7] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Ricerca */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8E7] bg-[#F7F9F9]">
          <Search className="w-4 h-4 text-[#074E44] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca ricambi, codici OEM, targhe, telai VIN, ordini o sezioni..."
            className="flex-1 bg-transparent text-sm text-[#131C1B] placeholder-[#7C8E8A] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#667774] hover:text-[#131C1B] rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="font-mono text-[10px] text-[#566663] bg-white border border-[#D4DFDC] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Risultati */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#F0F4F3]">
          {entries.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-[#566663]">
              Nessun risultato corrispondente a &ldquo;{query}&rdquo;. Prova con un altro termine, codice OEM o targa.
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    entry.execute();
                    onClose();
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#EAF3F1]' : 'bg-white hover:bg-[#F6F8F8]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#074E44] text-white border-[#074E44]'
                          : 'bg-[#F4F7F6] text-[#074E44] border-[#DCE4E2]'
                      }`}
                    >
                      {entry.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#131C1B] truncate">
                          {entry.title}
                        </span>
                        <span className="text-[10px] font-semibold text-[#566663] uppercase tracking-wide shrink-0">
                          · {entry.group}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#566663] truncate">{entry.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.badge && (
                      <span className="font-mono tabular-nums text-[11px] font-bold text-[#074E44]">
                        {entry.badge}
                      </span>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? 'text-[#074E44]' : 'text-[#A0B0AC]'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#F6F8F8] border-t border-[#E2E8E7] flex items-center justify-between text-[11px] text-[#566663]">
          <span>Usa ↑ ↓ per scorrere, Invio per aprire</span>
          <span className="font-mono tabular-nums">{entries.length} voci</span>
        </div>
      </div>
    </div>
  );
};
