import React, { useState, useEffect } from 'react';
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
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { CommandPalette } from './CommandPalette';
import { ActivityCenterDrawer } from './ActivityCenterDrawer';
import { UpdateNotificationModal } from '../updater/UpdateNotificationModal';
import { AutopiaLogo } from '../ui/DesignSystem';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdate } from '../../contexts/UpdateContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { openExternalUrl } from '../../services/externalLinkService';

export type DesktopSection =
  | 'dashboard'
  | 'vehicles'
  | 'parts'
  | 'orders'
  | 'listings'
  | 'import'
  | 'ebay'
  | 'settings'
  | 'admin';

interface DesktopShellProps {
  children?: React.ReactNode;
  activeSection: DesktopSection;
  onSelectSection: (section: DesktopSection) => void;
}

interface NavItem {
  id: DesktopSection;
  label: string;
  group: 'Operatività' | 'Catalogo & Canali' | 'Piattaforma';
  icon: React.ReactNode;
  badgeCount?: number;
  tag?: string;
  disabled?: boolean;
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
  const { currentVersion, updateAvailable, updateInfo, isChecking, checkForUpdates, openUpdateModal } = useUpdate();
  const { snapshot, isLoading: isRefreshingSnapshot, refreshSnapshot } = useDashboard();

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isApproved = status === 'AUTHENTICATED_APPROVED';
  const activeSeller = effectiveSellerProfile || sellerProfile;

  // Scorciatoia da tastiera desktop: Ctrl+K / Cmd+K per ricerca globale
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (isApproved) {
          e.preventDefault();
          setIsCommandOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isApproved]);

  const getSectionTitle = (sec: DesktopSection) => {
    switch (sec) {
      case 'dashboard':
        return 'Centro Operativo';
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

  const ordersAttentionCount =
    (snapshot?.kpis.pendingPurchaseRequests || 0) + (snapshot?.kpis.paidOrdersToShip || 0);
  const ebayAttentionCount = snapshot?.kpis.ebayOrdersToShip || 0;
  const adminAttentionCount = snapshot?.adminOverview?.pendingSellers || 0;
  const totalNotificationsCount = (snapshot?.alerts.length || 0) + (updateAvailable ? 1 : 0);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      group: 'Operatività',
      label: 'Centro Operativo',
      icon: <LayoutDashboard className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'vehicles',
      group: 'Operatività',
      label: 'Veicoli Demoliti',
      icon: <Car className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'parts',
      group: 'Operatività',
      label: 'Magazzino Ricambi',
      icon: <Package className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'orders',
      group: 'Operatività',
      label: 'Ordini e Vendite',
      icon: <ShoppingBag className="w-4 h-4" />,
      badgeCount: ordersAttentionCount > 0 ? ordersAttentionCount : undefined,
      disabled: !isApproved,
    },
    {
      id: 'listings',
      group: 'Catalogo & Canali',
      label: 'Annunci Shop',
      icon: <Store className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'import',
      group: 'Catalogo & Canali',
      label: 'Importa CSV',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      disabled: !isApproved,
    },
    {
      id: 'ebay',
      group: 'Catalogo & Canali',
      label: 'Canale eBay',
      icon: <Globe className="w-4 h-4" />,
      badgeCount: ebayAttentionCount > 0 ? ebayAttentionCount : undefined,
      tag: 'Sandbox',
      disabled: !isApproved,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as DesktopSection,
            group: 'Piattaforma' as const,
            label: 'Amministrazione',
            icon: <ShieldCheck className="w-4 h-4" />,
            badgeCount: adminAttentionCount > 0 ? adminAttentionCount : undefined,
            disabled: false,
          },
          {
            id: 'settings' as DesktopSection,
            group: 'Piattaforma' as const,
            label: 'Impostazioni Server',
            icon: <Settings className="w-4 h-4" />,
            disabled: false,
          },
        ]
      : []),
  ];

  const groups: Array<NavItem['group']> = isAdmin
    ? ['Operatività', 'Catalogo & Canali', 'Piattaforma']
    : ['Operatività', 'Catalogo & Canali'];

  const getStatusText = () => {
    switch (status) {
      case 'INITIALIZING':
        return 'Inizializzazione desktop...';
      case 'UNCONFIGURED':
        return 'Configurazione backend richiesta';
      case 'UNAUTHENTICATED':
        return 'Accesso richiesto';
      case 'AUTHENTICATED_APPROVED':
        return 'Servizi operativi attivi';
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
    <div className="h-screen w-screen flex flex-col bg-[#EEF2F3] text-[#131C1B] font-sans overflow-hidden select-none">
      {/* 1. Barra Titolo Nativa Windows */}
      <TitleBar
        currentSectionTitle={getSectionTitle(activeSection)}
        sellerName={isApproved ? activeSeller?.business_name : null}
        canSearch={isApproved}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
      />

      {/* 2. Corpo Applicativo: Sidebar Grafite + Area Operativa Multi-Livello */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* SIDEBAR ARCHITETTURALE SCURA */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-[68px]' : 'w-64'
          } bg-[#121B1A] border-r border-[#22302E] text-[#DCE6E3] flex flex-col justify-between shrink-0 transition-all duration-150`}
        >
          {/* Header Sidebar */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-14 px-3.5 border-b border-[#22302E] flex items-center justify-between gap-2 shrink-0">
              {!isSidebarCollapsed ? (
                <AutopiaLogo size="sm" subtitle="OPERATIONS" theme="dark" />
              ) : (
                <div className="mx-auto">
                  <AutopiaLogo size="sm" subtitle="" theme="dark" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                title={isSidebarCollapsed ? 'Espandi barra laterale' : 'Comprimi barra laterale'}
                className="p-1.5 rounded-lg text-[#7E948F] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Navigazione Gerarchica */}
            <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
              {groups.map((grp) => {
                const groupItems = navItems.filter((i) => i.group === grp);
                if (groupItems.length === 0) return null;

                return (
                  <div key={grp} className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#69807B]">
                        {grp}
                      </div>
                    )}
                    <nav className="space-y-0.5" aria-label={grp}>
                      {groupItems.map((item) => {
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
                            title={isSidebarCollapsed ? item.label : undefined}
                            className={`relative w-full flex items-center ${
                              isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                            } py-2 rounded-lg text-[12.5px] transition-all duration-150 text-left ${
                              isActive
                                ? 'bg-[#1B2C29] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                : isDisabled
                                ? 'text-[#526561] cursor-not-allowed opacity-60 font-medium'
                                : 'text-[#A5B9B4] hover:bg-[#182422] hover:text-white font-medium cursor-pointer'
                            }`}
                          >
                            {isActive && (
                              <span
                                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#14B8A6]"
                                aria-hidden="true"
                              />
                            )}

                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`shrink-0 ${
                                  isActive
                                    ? 'text-[#5EEAD4]'
                                    : isDisabled
                                    ? 'text-[#485A56]'
                                    : 'text-[#7F9792]'
                                }`}
                              >
                                {item.icon}
                              </span>
                              {!isSidebarCollapsed && (
                                <span className="truncate whitespace-nowrap">{item.label}</span>
                              )}
                            </div>

                            {!isSidebarCollapsed && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.badgeCount !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#0D9488] text-white font-mono tabular-nums text-[10px] font-bold">
                                    {item.badgeCount}
                                  </span>
                                )}
                                {item.tag && !item.badgeCount && (
                                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#7F9792] bg-[#192523] border border-[#283936] px-1.5 py-0.5 rounded">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Sidebar: Profilo Azienda, Selettore Sede Admin & Azioni Sistema */}
          <div className="border-t border-[#22302E] bg-[#0F1716] p-2.5 space-y-2 shrink-0">
            {user ? (
              <div className="space-y-2">
                {!isSidebarCollapsed && (
                  <div className="bg-[#162120] border border-[#243431] rounded-xl p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[#5EEAD4] font-bold min-w-0">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-[#F2F7F6]">
                          {activeSeller?.business_name || 'Autodemolitore'}
                        </span>
                      </div>
                      {isAdmin && (
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#5EEAD4] bg-[#0A3A33] border border-[#175A50] px-1.5 py-0.5 rounded shrink-0">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[#889F9A] text-[11px] min-w-0">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    {isAdmin && availableSellers.length > 0 && (
                      <div className="pt-2 border-t border-[#243431] space-y-1">
                        <label className="text-[10px] text-[#7D948F] block font-semibold uppercase tracking-wider">
                          Sede attiva in gestione
                        </label>
                        <select
                          value={adminSelectedSellerId || activeSeller?.id || ''}
                          onChange={(e) => setAdminSelectedSellerId(e.target.value)}
                          className="w-full bg-[#101817] border border-[#2B3D39] rounded-lg px-2 py-1.5 text-[11px] text-[#EDF3F1] focus:outline-none focus:border-[#14B8A6] cursor-pointer"
                        >
                          {availableSellers.map((s) => (
                            <option key={s.id} value={s.id} className="bg-white text-[#131C1B]">
                              {s.business_name} ({s.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`grid ${
                    isSidebarCollapsed ? 'grid-cols-1 gap-1.5' : 'grid-cols-2 gap-1.5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => checkForUpdates(true)}
                    disabled={isChecking}
                    className="py-1.5 px-2 bg-[#162120] hover:bg-[#1E2C2A] text-[#C2D1CD] border border-[#263633] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    title="Verifica aggiornamenti disponibili"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isChecking ? 'animate-spin text-[#5EEAD4]' : ''}`}
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate font-mono">
                        {updateAvailable ? 'Aggiorna' : `v${currentVersion}`}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    title="Esci dall'account"
                    className="py-1.5 px-2 bg-[#162120] hover:bg-red-950/60 hover:text-red-300 hover:border-red-900/70 text-[#B4C4C0] border border-[#263633] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    {!isSidebarCollapsed && <span>Esci</span>}
                  </button>
                </div>
              </div>
            ) : (
              !isSidebarCollapsed && (
                <div className="bg-[#162120] border border-[#243431] rounded-xl p-3 text-[11px] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#EDF3F1]">Portale Shop</span>
                    <button
                      type="button"
                      onClick={() => openExternalUrl('https://autopiashop.it')}
                      className="text-[#5EEAD4] hover:underline inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                    >
                      <span>autopiashop.it</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#889F9A] leading-snug">
                    Accesso riservato agli autodemolitori partner Autopia.
                  </p>

                  <button
                    type="button"
                    onClick={() => checkForUpdates(true)}
                    disabled={isChecking}
                    className="w-full py-1.5 px-2.5 bg-[#101817] hover:bg-[#1D2B29] text-[#DCE6E3] border border-[#273835] rounded-lg text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <span className="flex items-center gap-1.5">
                      <RefreshCw
                        className={`w-3 h-3 text-[#5EEAD4] ${isChecking ? 'animate-spin' : ''}`}
                      />
                      <span>{updateAvailable ? 'Aggiornamento pronto' : 'Verifica aggiornamenti'}</span>
                    </span>
                    <span className="font-mono tabular-nums text-[10px] text-[#889F9A]">
                      v{currentVersion}
                    </span>
                  </button>
                </div>
              )
            )}
          </div>
        </aside>

        {/* AREA DI LAVORO PRINCIPALE */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header Operativo Superiore (solo utenti autenticati approvati) */}
          {isApproved && (
            <div className="h-14 bg-white border-b border-[#DCE4E2] px-6 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-extrabold text-[#131C1B] tracking-tight whitespace-nowrap">
                  {getSectionTitle(activeSection)}
                </span>
                {activeSeller && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#566663] truncate">
                    <span className="text-[#C4D1CE]">·</span>
                    <span className="truncate font-medium text-[#334441]">
                      {activeSeller.business_name}
                    </span>
                    {activeSeller.city && (
                      <span className="text-[#7B8C88]">({activeSeller.city})</span>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCommandOpen(true)}
                  className="h-8 px-3 bg-[#F4F7F6] hover:bg-[#EAEFED] border border-[#D4DFDC] rounded-lg text-xs text-[#455451] flex items-center gap-2 transition-colors cursor-pointer"
                  title="Ricerca rapida globale (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-[#074E44]" />
                  <span className="hidden md:inline">Cerca ricambi, targhe, OEM...</span>
                  <span className="md:hidden">Cerca</span>
                  <kbd className="hidden sm:inline font-mono text-[10px] text-[#566663] bg-white border border-[#D4DFDC] px-1.5 rounded">
                    Ctrl+K
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={refreshSnapshot}
                  disabled={isRefreshingSnapshot}
                  title="Aggiorna dati dal server"
                  className="h-8 w-8 bg-white hover:bg-[#F4F7F6] border border-[#D4DFDC] rounded-lg flex items-center justify-center text-[#3F4E4B] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingSnapshot ? 'animate-spin text-[#074E44]' : ''}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsActivityOpen(true)}
                  title="Centro notifiche e azioni richieste"
                  className="relative h-8 px-2.5 bg-white hover:bg-[#F4F7F6] border border-[#D4DFDC] rounded-lg flex items-center gap-1.5 text-xs font-semibold text-[#131C1B] transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#074E44]" />
                  {totalNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#074E44] text-white font-mono tabular-nums text-[10px] font-bold rounded">
                      {totalNotificationsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openExternalUrl('https://autopiashop.it')}
                  className="hidden xl:inline-flex h-8 px-3 bg-white hover:bg-[#F4F7F6] border border-[#D4DFDC] rounded-lg items-center gap-1.5 text-xs font-semibold text-[#074E44] transition-colors cursor-pointer"
                >
                  <span>Autopia Shop</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Contenuto Pagina */}
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto bg-[#EEF2F3]">
            {children}
          </main>
        </div>
      </div>

      {/* Palette Comandi Globale (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        snapshot={snapshot}
        isAdmin={isAdmin}
        onSelectSection={onSelectSection}
        onCheckUpdates={() => checkForUpdates(true)}
        onRefreshData={refreshSnapshot}
      />

      {/* Drawer Notifiche & Azioni Richieste */}
      <ActivityCenterDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        snapshot={snapshot}
        updateAvailable={updateAvailable}
        updateVersion={updateInfo?.version}
        onOpenUpdateModal={openUpdateModal}
        onSelectSection={onSelectSection}
      />

      {/* Modale Aggiornamenti In-App */}
      <UpdateNotificationModal />

      {/* 3. Barra di Stato Inferiore */}
      <StatusBar
        backendConnected={isApproved}
        statusMessage={getStatusText()}
        sellerBusinessName={activeSeller?.business_name}
        lastSyncAt={snapshot?.fetchedAt || null}
      />
    </div>
  );
};
