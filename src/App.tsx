import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UpdateProvider } from './contexts/UpdateContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { DesktopShell, DesktopSection } from './components/desktop/DesktopShell';
import { DashboardControlCenter } from './components/dashboard/DashboardControlCenter';
import { LoginForm } from './components/auth/LoginForm';
import { BackendSettings } from './components/settings/BackendSettings';
import { VehiclesManager } from './components/vehicles/VehiclesManager';
import { PartsManager } from './components/parts/PartsManager';
import { ListingsManager } from './components/listings/ListingsManager';
import { CsvImportManager } from './components/import/CsvImportManager';
import { AdminManager } from './components/admin/AdminManager';
import { EbayManager } from './components/ebay/EbayManager';
import { OrdersManager } from './components/orders/OrdersManager';
import { AutopiaLogo, Button } from './components/ui/DesignSystem';
import {
  AlertTriangle,
  Loader2,
  LogOut,
  Settings,
} from 'lucide-react';

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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#121B1A] text-[#F1F6F5] font-sans select-none">
        <div className="flex flex-col items-center space-y-5">
          <AutopiaLogo size="lg" subtitle="OPERATIONS" theme="dark" />
          <p className="text-xs text-[#9BB0AB] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#5EEAD4]" />
            <span>Inizializzazione spazio di lavoro desktop...</span>
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
      <DesktopShell activeSection={activeSection} onSelectSection={setActiveSection}>
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
      <DesktopShell activeSection={activeSection} onSelectSection={setActiveSection}>
        <div className="flex-1 flex items-center justify-center p-6 bg-[#EEF2F3] font-sans">
          <div className="w-full max-w-lg bg-white border border-[#DCE4E2] rounded-2xl shadow-md p-7 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#131C1B]">
                  {status === 'AUTHENTICATED_PENDING' && 'Account in attesa di approvazione'}
                  {status === 'AUTHENTICATED_SUSPENDED' && 'Account venditore sospeso'}
                  {status === 'AUTHENTICATED_REJECTED' && 'Richiesta venditore non approvata'}
                  {status === 'AUTHENTICATED_NO_SELLER' && 'Profilo autodemolitore non trovato'}
                </h2>
                <div className="text-xs text-[#566663] mt-0.5">
                  Account collegato:{' '}
                  <span className="text-[#131C1B] font-semibold">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F6F8F8] p-4 rounded-xl border border-[#E1E8E6] text-xs text-[#334441] leading-relaxed">
              {errorMessage}
            </div>

            {sellerProfile && (
              <div className="bg-white p-3.5 rounded-xl border border-[#DCE4E2] text-xs space-y-1 text-[#566663]">
                <div>
                  Azienda: <strong className="text-[#131C1B]">{sellerProfile.business_name}</strong>
                </div>
                <div>
                  Città: <span className="text-[#131C1B]">{sellerProfile.city}</span>
                </div>
                <div>
                  Stato:{' '}
                  <span className="font-semibold text-amber-700 uppercase">
                    {sellerProfile.status}
                  </span>
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
                <span>Esci dall&apos;account</span>
              </Button>
            </div>
          </div>
        </div>
      </DesktopShell>
    );
  }

  // 5. Utente autenticato e approvato
  return (
    <DesktopShell activeSection={activeSection} onSelectSection={setActiveSection}>
      {activeSection === 'settings' && isAdmin && <BackendSettings />}
      {activeSection === 'dashboard' && activeSeller && (
        <DashboardControlCenter onSelectSection={setActiveSection} />
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
        <DashboardProvider>
          <AppContent />
        </DashboardProvider>
      </UpdateProvider>
    </AuthProvider>
  );
}
