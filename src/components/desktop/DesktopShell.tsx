import React from 'react';
import {
  LayoutDashboard,
  Car,
  Package,
  Store,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  LogOut,
  User,
  Building2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { UpdateNotificationModal } from '../updater/UpdateNotificationModal';
import { useAuth } from '../../contexts/AuthContext';

export type DesktopSection = 'dashboard' | 'vehicles' | 'parts' | 'listings' | 'import' | 'ebay' | 'settings' | 'admin';

interface DesktopShellProps {
  children?: React.ReactNode;
  activeSection: DesktopSection;
  onSelectSection: (section: DesktopSection) => void;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  children,
  activeSection,
  onSelectSection,
}) => {
  const {
    status,
    user,
    sellerProfile,
    effectiveSellerProfile,
    isAdmin,
    adminSelectedSellerId,
    setAdminSelectedSellerId,
    availableSellers,
    logout,
  } = useAuth();

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
      case 'ebay':
        return 'Integrazione Canale eBay (Sandbox)';
      case 'settings':
        return 'Connessione Backend & Autenticazione';
      case 'admin':
        return 'Amministrazione Piattaforma Autopia';
      default:
        return 'Autopia Manager';
    }
  };

  const isApproved = status === 'AUTHENTICATED_APPROVED';

  interface NavItem {
    id: DesktopSection;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    disabled?: boolean;
  }

  const baseNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Cruscotto (Dashboard)',
      icon: <LayoutDashboard className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'vehicles',
      label: 'Veicoli Demoliti',
      icon: <Car className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'parts',
      label: 'Magazzino & Ricambi',
      icon: <Package className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'listings',
      label: 'Annunci Autopia Shop',
      icon: <Store className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'import',
      label: 'Importazione CSV',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'ebay',
      label: 'Canale eBay',
      icon: <Globe className="w-4 h-4 text-amber-400" />,
      badge: 'Sandbox',
      disabled: !isApproved,
    },
  ];

  // Le sezioni Amministrazione Piattaforma e Connessione Backend sono visibili ed accessibili
  // ESCLUSIVAMENTE all'account amministratore con email lollogamer2009@gmail.com
  const navItems: NavItem[] = isAdmin
    ? [
        ...baseNavItems,
        {
          id: 'admin' as DesktopSection,
          label: 'Amministrazione Autopia',
          icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
          badge: 'SuperAdmin',
          disabled: false,
        },
        {
          id: 'settings' as DesktopSection,
          label: 'Connessione Backend & Sicurezza',
          icon: <Settings className="w-4 h-4 text-amber-400" />,
          badge: 'Master',
          disabled: false,
        },
      ]
    : baseNavItems;

  const getStatusText = () => {
    switch (status) {
      case 'INITIALIZING':
        return 'Verifica configurazione e sessione in corso...';
      case 'UNCONFIGURED':
        return 'Backend Supabase non configurato';
      case 'UNAUTHENTICATED':
        return 'In attesa di login autodemolitore';
      case 'AUTHENTICATED_APPROVED':
        return `Connesso: ${effectiveSellerProfile?.business_name || sellerProfile?.business_name || 'Autodemolitore'}`;
      case 'AUTHENTICATED_PENDING':
        return 'Account in attesa di approvazione da Autopia';
      case 'AUTHENTICATED_SUSPENDED':
        return 'Account venditore sospeso';
      case 'AUTHENTICATED_REJECTED':
        return 'Account venditore non approvato';
      case 'AUTHENTICATED_NO_SELLER':
        return 'Nessun profilo venditore associato';
      case 'NETWORK_ERROR':
        return 'Errore di connessione di rete con Supabase';
      default:
        return 'Stato non definito';
    }
  };

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
                const isDisabled = item.disabled && activeSection !== item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) onSelectSection(item.id);
                    }}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                        : isDisabled
                        ? 'text-slate-600 cursor-not-allowed opacity-60'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isActive ? 'text-amber-400' : isDisabled ? 'text-slate-600' : 'text-slate-400'}>
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

          {/* Area Utente Autenticato e Logout */}
          <div className="border-t border-slate-800/80 bg-slate-950/60 p-3 space-y-2.5">
            {user ? (
              <div className="space-y-2">
                <div className="bg-slate-900 border border-slate-800 rounded p-2.5 space-y-1.5 text-xs">
                  {isAdmin && (
                    <div className="pb-1 border-b border-purple-500/20 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-1">
                        <ShieldAlert className="w-3 h-3 text-purple-400" />
                        <span>Master Admin</span>
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                        Autopia Staff
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{effectiveSellerProfile?.business_name || 'Autodemolitore'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  {/* Switcher Contesto Piazzale per Master Admin */}
                  {isAdmin && availableSellers.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-800 space-y-1">
                      <label className="text-[10px] text-slate-400 block font-medium">
                        Piazzale in Gestione:
                      </label>
                      <select
                        value={adminSelectedSellerId || effectiveSellerProfile?.id || ''}
                        onChange={(e) => setAdminSelectedSellerId(e.target.value)}
                        className="w-full bg-slate-950 border border-purple-500/40 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-purple-400"
                      >
                        {availableSellers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.business_name} ({s.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!isAdmin && sellerProfile && (
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Stato Venditore:</span>
                      <span
                        className={`font-semibold uppercase text-[9px] px-1.5 py-0.2 rounded ${
                          sellerProfile.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {sellerProfile.status}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-1.5 px-2 bg-slate-900 hover:bg-red-950/40 hover:text-red-300 text-slate-400 border border-slate-800 hover:border-red-800/50 rounded text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnetti Account</span>
                </button>
              </div>
            ) : (
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
                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Accesso riservato agli autodemolitori accreditati.</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Area di Lavoro Principale */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Modale Aggiornamenti Software (Tauri v2 Updater) */}
      <UpdateNotificationModal />

      {/* 3. Barra di Stato Desktop */}
      <StatusBar
        backendConnected={isApproved}
        statusMessage={getStatusText()}
        sellerBusinessName={effectiveSellerProfile?.business_name || sellerProfile?.business_name}
      />
    </div>
  );
};
