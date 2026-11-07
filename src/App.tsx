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
import {
  Wrench,
  CheckCircle2,
  Building2,
  MapPin,
  FileText,
  Mail,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  LogOut,
  Car,
  Package,
  Store,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  Globe,
  ShoppingBag,
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans select-none">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold tracking-wider text-slate-100 uppercase">
              AUTOPIA <span className="text-amber-400">MANAGER</span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center space-x-2 justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Verifica sessione e configurazione in corso...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Schermata impostazioni (accessibile solo ed esclusivamente se l'account è master admin)
  const isSettingsActive = activeSection === 'settings' && isAdmin;

  // 3. Se non autenticato o configurazione mancante: mostra il form di login
  if ((status === 'UNAUTHENTICATED' || status === 'UNCONFIGURED') && !isSettingsActive) {
    return (
      <DesktopShell
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      >
        <LoginForm onOpenSettings={() => {
          if (isAdmin) setActiveSection('settings');
        }} />
      </DesktopShell>
    );
  }

  // 4. Se autenticato ma l'account non è abilitato / in attesa / sospeso
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
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 font-sans">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-7 space-y-5">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-7 h-7 shrink-0 text-amber-400" />
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  {status === 'AUTHENTICATED_PENDING' && 'Account in Attesa di Approvazione'}
                  {status === 'AUTHENTICATED_SUSPENDED' && 'Account Autodemolitore Sospeso'}
                  {status === 'AUTHENTICATED_REJECTED' && 'Richiesta Venditore Rifiutata'}
                  {status === 'AUTHENTICATED_NO_SELLER' && 'Nessun Profilo Venditore Trovato'}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  Accesso identificato: <span className="text-slate-200 font-mono">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
              {errorMessage}
            </div>

            {sellerProfile && (
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800/80 text-xs space-y-1 text-slate-400">
                <div>Azienda: <strong className="text-slate-200">{sellerProfile.business_name}</strong></div>
                <div>Stato corrente: <span className="text-amber-400 uppercase font-mono">{sellerProfile.status}</span></div>
                <div>Città: <span className="text-slate-200">{sellerProfile.city}</span></div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setActiveSection('settings')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Parametri Connessione</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={logout}
                className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnetti Account</span>
              </button>
            </div>
          </div>
        </div>
      </DesktopShell>
    );
  }

  // 5. Utente autenticato e approvato (o schermata impostazioni esplicita)
  return (
    <DesktopShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
    >
      {/* Vista Impostazioni & Sicurezza Master (Riservata esclusivamente ad lollogamer2009@gmail.com) */}
      {activeSection === 'settings' && isAdmin && <BackendSettings />}

      {/* Vista Cruscotto (Dashboard) */}
      {activeSection === 'dashboard' && activeSeller && (
        <div className="p-6 max-w-6xl mx-auto space-y-6 font-sans">
          {/* Banner di Benvenuto Autodemolitore Approvato o Master Admin */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{isAdmin ? 'MASTER ADMIN PIATTAFORMA' : 'AUTODEMOLITORE APPROVATO'}</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  seller_id: {activeSeller.id.slice(0, 8)}...
                </span>
                {isAdmin && (
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/60 px-1.5 py-0.2 rounded font-mono font-bold">
                    Supervisione Rete Attiva
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>{activeSeller.business_name}</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{activeSeller.city} ({activeSeller.province || 'IT'})</span>
                </span>
                {activeSeller.vat_number && (
                  <span className="flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>P.IVA: {activeSeller.vat_number}</span>
                  </span>
                )}
                <span className="flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span>{user?.email}</span>
                </span>
              </p>
            </div>

            <div className="text-right space-y-1 text-xs">
              <div className="text-slate-400">Collegamento Backend:</div>
              <div className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded inline-block">
                Supabase Auth RLS Attivo
              </div>
            </div>
          </div>

          {/* Griglia Moduli Gestionale Fase 2 Completi e Funzionanti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveSection('vehicles')}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Parco Veicoli
                </span>
                <Car className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">Veicoli in Demolizione</div>
              <p className="text-xs text-slate-400">
                Registro ingressi, targhe, telaio VIN e catalogo centrale 11.346 modelli (`seller_vehicles`).
              </p>
              <div className="pt-2 text-xs text-amber-400 font-medium flex items-center space-x-1">
                <span>Gestisci Parco Veicoli →</span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection('parts')}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Magazzino
                </span>
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">Ricambi & Scaffalature</div>
              <p className="text-xs text-slate-400">
                Codici OEM, giacenze, prezzi, corsie/scaffali e scarico rapido vendita (`inventories`).
              </p>
              <div className="pt-2 text-xs text-blue-400 font-medium flex items-center space-x-1">
                <span>Accedi al Magazzino →</span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection('orders')}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vendite & Richieste
                </span>
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">Ordini & Acquisti</div>
              <p className="text-xs text-slate-400">
                Verifica i pezzi venduti, conferma le richieste clienti e gestisci spedizioni e tracking.
              </p>
              <div className="pt-2 text-xs text-emerald-400 font-medium flex items-center space-x-1">
                <span>Visualizza Ordini & Vendite →</span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection('listings')}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Marketplace
                </span>
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">Annunci Autopia Shop</div>
              <p className="text-xs text-slate-400">
                Controllo inserzioni online, visibilità e sincronizzazione immediata con autopiashop.it.
              </p>
              <div className="pt-2 text-xs text-emerald-400 font-medium flex items-center space-x-1">
                <span>Gestisci Annunci Online →</span>
              </div>
            </div>

            <div
              onClick={() => setActiveSection('import')}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Importazione
                </span>
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">Caricamento CSV Ricambi</div>
              <p className="text-xs text-slate-400">
                Importazione massiva di giacenze con modello CSV Autopia e rilevamento automatico categorie.
              </p>
              <div className="pt-2 text-xs text-amber-400 font-medium flex items-center space-x-1">
                <span>Importa File CSV →</span>
              </div>
            </div>

            {/* Scheda Canale eBay Sandbox (Fase 3) */}
            <div
              onClick={() => setActiveSection('ebay')}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Marketplace Esterno
                </span>
                <Globe className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-slate-100">Canale eBay (Sandbox)</div>
              <p className="text-xs text-slate-400">
                Collegamento account tramite OAuth 2.0 protetto, stato autorizzazione e predisposizione sync.
              </p>
              <div className="pt-2 text-xs text-amber-400 font-medium flex items-center space-x-1">
                <span>Gestisci Canale eBay →</span>
              </div>
            </div>

            {/* Scheda Supervisione Amministratore (Visibile solo per lollogamer2009@gmail.com) */}
            {isAdmin && (
              <div
                onClick={() => setActiveSection('admin')}
                className="bg-slate-900 border border-purple-500/40 hover:border-purple-400 rounded-lg p-5 space-y-2 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    SuperAdmin
                  </span>
                  <ShieldAlert className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-lg font-bold text-slate-100">Amministrazione Autopia</div>
                <p className="text-xs text-slate-400">
                  Accrediti venditori, statistiche di rete e gestione centralizzata autodemolitori.
                </p>
                <div className="pt-2 text-xs text-purple-400 font-medium flex items-center space-x-1">
                  <span>Apri Console Master →</span>
                </div>
              </div>
            )}
          </div>

          {/* Dettagli Tecnico-Operativi Fase 2 Completata */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Autopia Manager Fase 2 Operativa & Fase 3 Avviata</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded border border-slate-800/80 space-y-1">
                <div className="font-semibold text-amber-400">Magazzino & Scarico Vendite Banco</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Le vendite al banco scalano in tempo reale le quantità disponibili in <code className="text-slate-300">inventories</code>, aggiornando lo stato degli annunci per prevenire doppie vendite online su autopiashop.it.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80 space-y-1">
                <div className="font-semibold text-purple-400">Sicurezza Ruoli & Privilegi Master</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Tutte le funzionalità di gestione e supervisione globale della piattaforma sono rigorosamente blindate e disponibili esclusivamente per <code className="text-purple-300 font-mono">lollogamer2009@gmail.com</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modulo Veicoli Demoliti Reale */}
      {activeSection === 'vehicles' && <VehiclesManager />}

      {/* Modulo Magazzino & Ricambi Reale (Fase 2) */}
      {activeSection === 'parts' && <PartsManager />}

      {/* Modulo Ordini & Richieste di Vendita */}
      {activeSection === 'orders' && <OrdersManager />}

      {/* Modulo Annunci Marketplace Autopia Shop (Fase 2) */}
      {activeSection === 'listings' && <ListingsManager />}

      {/* Modulo Importazione CSV (Fase 2) */}
      {activeSection === 'import' && <CsvImportManager />}

      {/* Modulo Canale eBay Sandbox (Fase 3) */}
      {activeSection === 'ebay' && <EbayManager />}

      {/* Modulo Amministrazione Piattaforma (Fase 2 - Riservato lollogamer2009@gmail.com) */}
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
