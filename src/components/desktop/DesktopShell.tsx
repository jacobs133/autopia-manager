import React from 'react';
import {
  LayoutDashboard,
  Car,
  Package,
  Store,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  LogOut,
  User,
  Building2,
  ExternalLink,
  Globe,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { UpdateNotificationModal } from '../updater/UpdateNotificationModal';
import { AutopiaLogo, uiClasses } from '../ui/DesignSystem';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdate } from '../../contexts/UpdateContext';
import { openExternalUrl } from '../../services/externalLinkService';

export type DesktopSection = 'dashboard' | 'vehicles' | 'parts' | 'orders' | 'listings' | 'import' | 'ebay' | 'settings' | 'admin';

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
  const { currentVersion, updateAvailable, isChecking, checkForUpdates } = useUpdate();

  const getSectionTitle = (sec: DesktopSection) => {
    switch (sec) {
      case 'dashboard':
        return 'Dashboard';
      case 'vehicles':
        return 'Veicoli Demoliti';
      case 'parts':
        return 'Magazzino Ricambi';
      case 'orders':
        return 'Ordini e Vendite';
      case 'listings':
        return 'Annunci Autopia Shop';
      case 'import':
        return 'Importazione CSV';
      case 'ebay':
        return 'Canale eBay';
      case 'settings':
        return 'Impostazioni Backend';
      case 'admin':
        return 'Amministrazione';
      default:
        return 'Autopia Manager';
    }
  };

  const isApproved = status === 'AUTHENTICATED_APPROVED';

  interface NavItem {
    id: DesktopSection;
    label: string;
    icon: React.ReactNode;
    tag?: string;
    disabled?: boolean;
  }

  const baseNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
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
      label: 'Magazzino Ricambi',
      icon: <Package className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'orders',
      label: 'Ordini e Vendite',
      icon: <ShoppingBag className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'listings',
      label: 'Annunci Shop',
      icon: <Store className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'import',
      label: 'Importa CSV',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'ebay',
      label: 'Canale eBay',
      icon: <Globe className="w-4 h-4" />,
      tag: 'Sandbox',
      disabled: !isApproved,
    },
  ];

  // Le sezioni Amministrazione e Connessione Backend sono riservate esclusivamente all'amministratore
  const navItems: NavItem[] = isAdmin
    ? [
        ...baseNavItems,
        {
          id: 'admin' as DesktopSection,
          label: 'Amministrazione',
          icon: <ShieldCheck className="w-4 h-4" />,
          disabled: false,
        },
        {
          id: 'settings' as DesktopSection,
          label: 'Connessione Backend',
          icon: <Settings className="w-4 h-4" />,
          disabled: false,
        },
      ]
    : baseNavItems;

  const getStatusText = () => {
    switch (status) {
      case 'INITIALIZING':
        return 'Avvio in corso...';
      case 'UNCONFIGURED':
        return 'Configurazione backend richiesta';
      case 'UNAUTHENTICATED':
        return 'Accesso richiesto';
      case 'AUTHENTICATED_APPROVED':
        return 'Account operativo';
      case 'AUTHENTICATED_PENDING':
        return 'Account in attesa di approvazione';
      case 'AUTHENTICATED_SUSPENDED':
        return 'Account sospeso';
      case 'AUTHENTICATED_REJECTED':
        return 'Account non approvato';
      case 'AUTHENTICATED_NO_SELLER':
        return 'Nessun profilo associato';
      case 'NETWORK_ERROR':
        return 'Errore di rete';
      default:
        return 'Stato non disponibile';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F5F7F7] text-[#1A2322] font-sans overflow-hidden select-none">
      {/* Barra superiore finestra */}
      <TitleBar currentSectionTitle={getSectionTitle(activeSection)} />

      {/* Corpo principale: sidebar laterale + area centrale */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="w-60 bg-white border-r border-[#E2E8E7] flex flex-col justify-between shrink-0">
          {/* Logo e Menu di navigazione */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 border-b border-[#EEF2F1]">
              <AutopiaLogo size="md" subtitle="MANAGER" />
            </div>

            <div className="p-3">
              <nav className="space-y-0.5" aria-label="Navigazione principale">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-colors text-left ${
                        isActive
                          ? 'bg-[#EAF3F1] text-[#074E44] font-semibold'
                          : isDisabled
                          ? 'text-[#A0AEAB] cursor-not-allowed opacity-60 font-medium'
                          : 'text-[#3F4E4B] hover:bg-[#F3F6F5] hover:text-[#1A2322] font-medium cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`shrink-0 ${
                            isActive
                              ? 'text-[#074E44]'
                              : isDisabled
                              ? 'text-[#B2BFBC]'
                              : 'text-[#6A7A77]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate whitespace-nowrap">{item.label}</span>
                      </div>

                      {item.tag && (
                        <span className="text-[10px] font-medium text-[#5C6B68] bg-[#F2F6F5] px-1.5 py-0.5 rounded shrink-0">
                          {item.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Area profilo utente e azioni inferiori */}
          <div className="border-t border-[#E2E8E7] bg-[#FAFBFB] p-3 space-y-2.5">
            {user ? (
              <div className="space-y-2">
                <div className="bg-white border border-[#E2E8E7] rounded-xl p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[#074E44] font-semibold min-w-0">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {effectiveSellerProfile?.business_name || 'Autodemolitore'}
                      </span>
                    </div>
                    {isAdmin && (
                      <span className="text-[10px] font-semibold text-[#074E44] bg-[#EAF3F1] px-1.5 py-0.5 rounded shrink-0">
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[#5C6B68] text-[11px] min-w-0">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  {isAdmin && availableSellers.length > 0 && (
                    <div className="pt-1.5 border-t border-[#EEF2F1] space-y-1">
                      <label className="text-[10px] text-[#5C6B68] block font-semibold">
                        Sede in gestione
                      </label>
                      <select
                        value={adminSelectedSellerId || effectiveSellerProfile?.id || ''}
                        onChange={(e) => setAdminSelectedSellerId(e.target.value)}
                        className={`${uiClasses.select} py-1 px-2 text-[11px]`}
                      >
                        {availableSellers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.business_name} ({s.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => checkForUpdates(true)}
                    disabled={isChecking}
                    className="py-1.5 px-2 bg-white hover:bg-[#F2F6F5] text-[#3F4E4B] border border-[#D7E0DE] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    title="Verifica aggiornamenti disponibili"
                  >
                    <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-[#074E44]' : ''}`} />
                    <span className="truncate">
                      {updateAvailable ? 'Aggiorna' : `v${currentVersion}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="py-1.5 px-2 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-[#4F5E5B] border border-[#D7E0DE] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Esci</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E2E8E7] rounded-xl p-3 text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1A2322]">Portale Shop</span>
                  <button
                    type="button"
                    onClick={() => openExternalUrl('https://autopiashop.it')}
                    className="text-[#074E44] hover:underline inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                  >
                    <span>autopiashop.it</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-[11px] text-[#5C6B68] leading-snug">
                  Accesso riservato ai centri di demolizione autorizzati.
                </p>

                <button
                  type="button"
                  onClick={() => checkForUpdates(true)}
                  disabled={isChecking}
                  className="w-full py-1.5 px-2.5 bg-[#F5F7F7] hover:bg-[#EAF3F1] text-[#1A2322] border border-[#D7E0DE] rounded-lg text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className={`w-3 h-3 text-[#074E44] ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{updateAvailable ? 'Aggiornamento pronto' : 'Verifica aggiornamenti'}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[10px] text-[#5C6B68]">
                    v{currentVersion}
                  </span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Area di Lavoro Principale */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F5F7F7] overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Modale Aggiornamenti In-App */}
      <UpdateNotificationModal />

      {/* Barra di Stato Inferiore */}
      <StatusBar
        backendConnected={isApproved}
        statusMessage={getStatusText()}
        sellerBusinessName={effectiveSellerProfile?.business_name || sellerProfile?.business_name}
      />
    </div>
  );
};
