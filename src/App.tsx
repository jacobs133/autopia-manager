import React, { useState } from 'react';
import {
  AuthProvider,
  useAuth,
} from './contexts/AuthContext';
import { UpdateProvider } from './contexts/UpdateContext';
import {
  DesktopShell,
  DesktopSection,
} from './components/desktop/DesktopShell';
import { LoginForm } from './components/auth/LoginForm';
import { BackendSettings } from './components/settings/BackendSettings';
import { VehiclesManager } from './components/vehicles/VehiclesManager';
import { PartsManager } from './components/parts/PartsManager';
import { ListingsManager } from './components/listings/ListingsManager';
import { CsvImportManager } from './components/import/CsvImportManager';
import { AdminManager } from './components/admin/AdminManager';
import { EbayManager } from './components/ebay/EbayManager';
import { OrdersManager } from './components/orders/OrdersManager';
import { AutopiaLogo, Button, StatusBadge } from './components/ui/DesignSystem';
import {
  CheckCircle2,
  MapPin,
  FileText,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  LogOut,
  Car,
  Package,
  Store,
  FileSpreadsheet,
  Settings,
  Globe,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { openExternalUrl } from './services/externalLinkService';

function AppContent() {
  const {
    status,
    user,
    sellerProfile,
    effectiveSellerProfile,
    isAdmin,
    errorMessage,
    logout,
  } = useAuth();
  const [activeSection, setActiveSection] = useState<DesktopSection>('dashboard');

  const activeSeller = effectiveSellerProfile || sellerProfile;

  // 1. Schermata iniziale di caricamento
  if (status === 'INITIALIZING') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F5F7F7] text-[#1A2322] font-sans select-none">
        <div className="flex flex-col items-center space-y-5">
          <AutopiaLogo size="lg" subtitle="MANAGER" />
          <p className="text-xs text-[#5C6B68] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#074E44]" />
            <span>Caricamento spazio di lavoro...</span>
          </p>
        </div>
      </div>
    );
  }

  // 2. Schermata impostazioni (accessibile solo ed esclusivamente all'account amministratore)
  const isSettingsActive = activeSection === 'settings' && isAdmin;

  // 3. Se non autenticato o configurazione mancante: mostra il login
  if ((status === 'UNAUTHENTICATED' || status === 'UNCONFIGURED') && !isSettingsActive) {
    return (
      <DesktopShell
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      >
        <LoginForm
          onOpenSettings={() => {
            if (isAdmin) setActiveSection('settings');
          }}
        />
      </DesktopShell>
    );
  }

  // 4. Se autenticato ma account in attesa / sospeso / rifiutato
  const isPendingOrRestricted =
    status === 'AUTHENTICATED_PENDING' ||
    status === 'AUTHENTICATED_SUSPENDED' ||
    status === 'AUTHENTICATED_REJECTED' ||
    status === 'AUTHENTICATED_NO_SELLER';

  if (isPendingOrRestricted && !isSettingsActive) {
    return (
      <DesktopShell
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      >
        <div className="flex-1 flex items-center justify-center p-6 bg-[#F5F7F7] font-sans">
          <div className="w-full max-w-lg bg-white border border-[#E2E8E7] rounded-2xl shadow-sm p-7 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1A2322]">
                  {status === 'AUTHENTICATED_PENDING' && 'Account in attesa di approvazione'}
                  {status === 'AUTHENTICATED_SUSPENDED' && 'Account venditore sospeso'}
                  {status === 'AUTHENTICATED_REJECTED' && 'Richiesta venditore non approvata'}
                  {status === 'AUTHENTICATED_NO_SELLER' && 'Profilo autodemolitore non trovato'}
                </h2>
                <div className="text-xs text-[#5C6B68] mt-0.5">
                  Account collegato: <span className="text-[#1A2322] font-medium">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F7FAF9] p-4 rounded-xl border border-[#E2E8E7] text-xs text-[#374845] leading-relaxed">
              {errorMessage}
            </div>

            {sellerProfile && (
              <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E7] text-xs space-y-1 text-[#5C6B68]">
                <div>
                  Azienda: <strong className="text-[#1A2322]">{sellerProfile.business_name}</strong>
                </div>
                <div>
                  Città: <span className="text-[#1A2322]">{sellerProfile.city}</span>
                </div>
                <div>
                  Stato: <span className="font-semibold text-amber-700 uppercase">{sellerProfile.status}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {isAdmin ? (
                <Button variant="secondary" size="sm" onClick={() => setActiveSection('settings')}>
                  <Settings className="w-3.5 h-3.5" />
                  <span>Impostazioni Server</span>
                </Button>
              ) : (
                <div />
              )}

              <Button variant="danger" size="sm" onClick={logout}>
                <LogOut className="w-3.5 h-3.5" />
                <span>Esci dall'account</span>
              </Button>
            </div>
          </div>
        </div>
      </DesktopShell>
    );
  }

  // Moduli principali della Dashboard
  const dashboardCards: Array<{
    id: DesktopSection;
    title: string;
    subtitle: string;
    description: string;
    actionLabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'vehicles',
      title: 'Veicoli in Demolizione',
      subtitle: 'Parco veicoli',
      description: 'Registra targhe, telai VIN, dati vettura ed estrai rapidamente i ricambi.',
      actionLabel: 'Apri veicoli',
      icon: <Car className="w-5 h-5" />,
    },
    {
      id: 'parts',
      title: 'Magazzino & Scaffalature',
      subtitle: 'Inventario ricambi',
      description: 'Gestisci codici OEM, giacenze, prezzi, posizioni in magazzino e vendite al banco.',
      actionLabel: 'Apri magazzino',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'orders',
      title: 'Ordini & Richieste',
      subtitle: 'Vendite online',
      description: 'Conferma le richieste dei clienti, prepara le spedizioni e inserisci il tracking.',
      actionLabel: 'Apri ordini',
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      id: 'listings',
      title: 'Annunci Autopia Shop',
      subtitle: 'Vetrina online',
      description: 'Controlla visibilità, prezzi e pubblicazione dei ricambi su autopiashop.it.',
      actionLabel: 'Gestisci annunci',
      icon: <Store className="w-5 h-5" />,
    },
    {
      id: 'import',
      title: 'Importazione CSV',
      subtitle: 'Caricamento rapido',
      description: 'Importa in blocco il catalogo ricambi da file CSV con verifica automatica.',
      actionLabel: 'Importa file',
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      id: 'ebay',
      title: 'Canale eBay',
      subtitle: 'Integrazione esterna',
      description: 'Collega il tuo account venditore, pubblica inserzioni e sincronizza le disponibilità.',
      actionLabel: 'Gestisci eBay',
      icon: <Globe className="w-5 h-5" />,
    },
  ];

  // 5. Utente autenticato e approvato
  return (
    <DesktopShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
    >
      {/* Vista Impostazioni Master (solo Admin) */}
      {activeSection === 'settings' && isAdmin && <BackendSettings />}

      {/* Vista Dashboard */}
      {activeSection === 'dashboard' && activeSeller && (
        <div className="p-6 max-w-6xl mx-auto w-full space-y-6 font-sans">
          {/* Intestazione Azienda */}
          <div className="bg-white border border-[#E2E8E7] rounded-xl p-6 shadow-[0_1px_2px_rgba(7,78,68,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isAdmin ? 'Amministratore Piattaforma' : 'Autodemolitore Verificato'}</span>
                </StatusBadge>
              </div>

              <h1 className="text-2xl font-bold text-[#1A2322] tracking-tight">
                {activeSeller.business_name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C6B68]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#074E44]" />
                  <span>
                    {activeSeller.city}
                    {activeSeller.province ? ` (${activeSeller.province})` : ''}
                  </span>
                </span>
                {activeSeller.vat_number && (
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#074E44]" />
                    <span className="tabular-nums">P.IVA {activeSeller.vat_number}</span>
                  </span>
                )}
                {user?.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#074E44]" />
                    <span>{user.email}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openExternalUrl('https://autopiashop.it')}
              >
                <span>Apri Autopia Shop</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveSection('parts')}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Vai al Magazzino</span>
              </Button>
            </div>
          </div>

          {/* Moduli Operativi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveSection(card.id)}
                className="group text-left bg-white border border-[#E2E8E7] hover:border-[#074E44]/50 hover:shadow-[0_6px_18px_rgba(7,78,68,0.06)] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#5C6B68]">{card.subtitle}</span>
                    <div className="w-9 h-9 rounded-lg bg-[#EAF3F1] text-[#074E44] flex items-center justify-center group-hover:bg-[#074E44] group-hover:text-white transition-colors">
                      {card.icon}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-[#1A2322]">{card.title}</h2>
                    <p className="text-xs text-[#5C6B68] leading-relaxed">{card.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F4F3] flex items-center justify-between text-xs font-semibold text-[#074E44]">
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveSection('admin')}
                className="group text-left bg-white border border-[#C6DFDA] hover:border-[#074E44] hover:shadow-[0_6px_18px_rgba(7,78,68,0.08)] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#074E44]">Area Amministratore</span>
                    <div className="w-9 h-9 rounded-lg bg-[#074E44] text-white flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-[#1A2322]">Amministrazione Piattaforma</h2>
                    <p className="text-xs text-[#5C6B68] leading-relaxed">
                      Approva nuovi autodemolitori, monitora la rete venditori e gestisci gli accessi.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F4F3] flex items-center justify-between text-xs font-semibold text-[#074E44]">
                  <span>Apri amministrazione</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {activeSection === 'vehicles' && <VehiclesManager />}
      {activeSection === 'parts' && <PartsManager />}
      {activeSection === 'orders' && <OrdersManager />}
      {activeSection === 'listings' && <ListingsManager />}
      {activeSection === 'import' && <CsvImportManager />}
      {activeSection === 'ebay' && <EbayManager />}
      {activeSection === 'admin' && <AdminManager />}
    </DesktopShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UpdateProvider>
        <AppContent />
      </UpdateProvider>
    </AuthProvider>
  );
}
