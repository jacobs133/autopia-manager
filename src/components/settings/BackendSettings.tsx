import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Server,
  Car,
  DownloadCloud,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useUpdate } from '../../contexts/UpdateContext';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testBackendConnection,
  validateSupabaseCredentials,
} from '../../services/supabaseClient';
import {
  fetchCatalogTotalCount,
  fetchCatalogMakes,
  clearCatalogCache,
} from '../../services/vehiclesService';
import { ADMIN_EMAIL } from '../../services/partsService';
import { useAuth } from '../../contexts/AuthContext';
import {
  uiClasses,
  Button,
  StatusBadge,
  AlertBanner,
} from '../ui/DesignSystem';

export const BackendSettings: React.FC = () => {
  const { refreshAuth, status, user, sellerProfile, isAdmin, userRoles } = useAuth();
  const {
    currentVersion,
    updateAvailable,
    updateInfo,
    isChecking,
    progress,
    checkForUpdates,
    startInstall,
    relaunch,
    autoCheckEnabled,
    checkIntervalHours,
    setAutoCheckEnabled,
    setCheckIntervalHoursPreference,
    postponeUpdate,
  } = useUpdate();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isFromEnv, setIsFromEnv] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [catalogStats, setCatalogStats] = useState<{
    totalCount: number | null;
    totalMakes: number | null;
    isLoading: boolean;
    error: string | null;
  }>({
    totalCount: null,
    totalMakes: null,
    isLoading: false,
    error: null,
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const checkCatalog = async (force = false) => {
    setCatalogStats((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (force) clearCatalogCache();
      const [countRes, makesRes] = await Promise.all([
        fetchCatalogTotalCount(force),
        fetchCatalogMakes({ forceRefresh: force }),
      ]);
      setCatalogStats({
        totalCount: countRes.count,
        totalMakes: makesRes.data.length,
        isLoading: false,
        error: countRes.error || makesRes.error || null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore verifica catalogo';
      setCatalogStats((prev) => ({ ...prev, isLoading: false, error: msg }));
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const cfg = getSupabaseConfig();
    if (cfg) {
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setIsFromEnv(cfg.isFromEnv);
      checkCatalog();
    }
  }, [isAdmin]);

  // Controllo di sicurezza: accessibile ESCLUSIVAMENTE all'amministratore master
  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F5F7F7] font-sans text-[#1A2322] min-h-[60vh]">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-7 text-center space-y-4 shadow-sm">
          <div className="w-13 h-13 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#162220]">
              Accesso Riservato all'Amministratore
            </h2>
            <p className="text-xs text-[#5C6B68] mt-2 leading-relaxed">
              La configurazione della connessione backend, i parametri Supabase e la gestione
              sicurezza ruoli sono accessibili esclusivamente all'account amministratore autorizzato (
              <strong className="text-[#074E44] font-mono">{ADMIN_EMAIL}</strong>).
            </p>
          </div>
          <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#E2E8E7] text-[11px] text-[#5C6B68] font-mono">
            Politica di sicurezza Autopia • Accesso interdetto
          </div>
        </div>
      </div>
    );
  }

  const handleTestConnection = async () => {
    setSaveFeedback(null);
    setTestResult(null);

    const validation = validateSupabaseCredentials(url, anonKey);
    if (!validation.valid) {
      setTestResult({
        success: false,
        message: validation.error || 'Credenziali non valide',
      });
      return;
    }

    setIsTesting(true);
    try {
      const res = await testBackendConnection(url, anonKey);
      setTestResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la verifica di rete';
      setTestResult({
        success: false,
        message: msg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);
    setTestResult(null);

    const res = saveSupabaseConfig(url, anonKey);
    if (res.success) {
      setSaveFeedback({
        type: 'success',
        message: 'Parametri salvati nel client desktop. Connessione in aggiornamento...',
      });
      await refreshAuth();
    } else {
      setSaveFeedback({
        type: 'error',
        message: res.error || 'Errore durante il salvataggio dei parametri',
      });
    }
  };

  const handleClear = async () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setIsFromEnv(false);
    setTestResult(null);
    setShowClearConfirm(false);
    setSaveFeedback({
      type: 'success',
      message: 'Configurazione locale rimossa.',
    });
    await refreshAuth();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F7F7] font-sans text-[#1A2322]">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Intestazione */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8E7]">
          <div>
            <h1 className="text-xl font-bold text-[#162220] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#074E44]" />
              <span>Configurazione Connessione Backend</span>
            </h1>
            <p className="text-xs text-[#5C6B68] mt-1">
              Parametri di collegamento al backend di <strong className="text-[#1A2322]">autopiashop.it</strong>,
              verifica catalogo e aggiornamenti desktop.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[11px] text-[#5C6B68] mb-1">Stato del Client</div>
            {status === 'UNCONFIGURED' && (
              <StatusBadge tone="warning">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Non Configurato</span>
              </StatusBadge>
            )}
            {status === 'UNAUTHENTICATED' && (
              <StatusBadge tone="info">
                <Server className="w-3.5 h-3.5" />
                <span>Configurato • Login Necessario</span>
              </StatusBadge>
            )}
            {status === 'AUTHENTICATED_APPROVED' && (
              <StatusBadge tone="success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connesso ({sellerProfile?.business_name})</span>
              </StatusBadge>
            )}
            {status.startsWith('AUTHENTICATED_') && status !== 'AUTHENTICATED_APPROVED' && (
              <StatusBadge tone="warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Autenticato • Non Approvato</span>
              </StatusBadge>
            )}
            {status === 'NETWORK_ERROR' && (
              <StatusBadge tone="danger">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Errore di Rete</span>
              </StatusBadge>
            )}
          </div>
        </div>

        {/* Regola di Sicurezza */}
        <AlertBanner tone="info" title="Regola di Sicurezza: Solo Chiavi Pubbliche (Anon / Publishable)">
          Inserisci <strong>esclusivamente la chiave pubblica anonima</strong> del progetto Supabase di
          Autopia. Non inserire mai la chiave <code className="font-mono font-semibold">service_role</code>:
          il gestionale opera sotto le policy Row Level Security (RLS) dell'autodemolitore autenticato.
        </AlertBanner>

        {saveFeedback && (
          <AlertBanner
            tone={saveFeedback.type === 'success' ? 'success' : 'danger'}
            onDismiss={() => setSaveFeedback(null)}
          >
            {saveFeedback.message}
          </AlertBanner>
        )}

        {testResult && (
          <AlertBanner
            tone={testResult.success ? 'success' : 'danger'}
            title={testResult.success ? 'Connessione Riuscita' : 'Test di Connessione Fallito'}
            onDismiss={() => setTestResult(null)}
          >
            {testResult.message}
          </AlertBanner>
        )}

        {/* Modulo Configurazione */}
        <form onSubmit={handleSave} className={`${uiClasses.card} p-5 space-y-4 text-xs`}>
          {isFromEnv && (
            <AlertBanner tone="info">
              Configurazione caricata dalle variabili d'ambiente di compilazione (.env).
            </AlertBanner>
          )}

          <div>
            <label className={uiClasses.label}>URL Progetto Supabase Autopia</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzabcdefghijklmnopq.supabase.co"
              required
              disabled={isFromEnv}
              className={`${uiClasses.input} font-mono`}
            />
            <span className="text-[11px] text-[#5C6B68] block mt-1">
              Disponibile nella console Supabase in <strong>Project Settings → API → Project URL</strong>.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#2E3C3A]">
                Chiave Pubblica Anon / Publishable Key
              </label>
              <span className="text-[11px] text-[#5C6B68]">Nessun token segreto</span>
            </div>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              disabled={isFromEnv}
              className={`${uiClasses.input} font-mono`}
            />
            <span className="text-[11px] text-[#5C6B68] block mt-1">
              Disponibile nella console Supabase in{' '}
              <strong>Project Settings → API → Project API Keys → anon / public</strong>.
            </span>
          </div>

          <div className="pt-3 border-t border-[#EEF2F1] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestConnection}
                loading={isTesting}
                disabled={!url || !anonKey}
              >
                {!isTesting && <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isTesting ? 'Test in corso...' : 'Testa Connessione'}</span>
              </Button>

              {!isFromEnv && (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!url || !anonKey}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Parametri</span>
                </Button>
              )}
            </div>

            {!isFromEnv && url && (
              <div className="flex items-center gap-2">
                {showClearConfirm ? (
                  <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                    <span className="text-[11px] text-red-800 font-semibold">Confermi?</span>
                    <Button variant="danger" size="xs" onClick={handleClear}>
                      Sì, Rimuovi
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Rimuovi Configurazione</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Profilo Autenticato Attuale */}
        {user && sellerProfile && (
          <div className={`${uiClasses.card} p-5 space-y-3 text-xs`}>
            <div className="font-bold text-[#162220] flex items-center justify-between">
              <span>Sessione Autenticata Attiva</span>
              <StatusBadge tone="success">Status: {sellerProfile.status}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7]">
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Azienda</span>
                <span className="text-[#1A2322] font-semibold">{sellerProfile.business_name}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Partita IVA</span>
                <span className="text-[#1A2322] font-medium font-mono">
                  {sellerProfile.vat_number || 'Non specificata'}
                </span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Città</span>
                <span className="text-[#1A2322] font-medium">
                  {sellerProfile.city} ({sellerProfile.province || ''})
                </span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Email Utente</span>
                <span className="text-[#1A2322] font-medium">{user.email}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">ID Venditore</span>
                <span className="text-[#5C6B68] font-mono text-[11px] truncate block">
                  {sellerProfile.id}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stato Catalogo Veicoli Centrale */}
        <div className={`${uiClasses.card} p-5 space-y-3 text-xs`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[#074E44]" />
              <span className="font-bold text-[#162220] uppercase tracking-wider text-xs">
                Stato Catalogo Veicoli Centrale
              </span>
            </div>

            <Button
              variant="secondary"
              size="xs"
              onClick={() => checkCatalog(true)}
              loading={catalogStats.isLoading}
            >
              {!catalogStats.isLoading && <RefreshCw className="w-3.5 h-3.5" />}
              <span>Svuota Cache & Verifica Live</span>
            </Button>
          </div>

          <p className="text-[#5C6B68] text-[11px] leading-relaxed">
            Autopia Manager interroga il catalogo centrale veicoli con paginazione batch da 1.000
            record per garantire che tutte le marche, modelli e varianti siano disponibili senza troncamenti.
          </p>

          {catalogStats.isLoading && (
            <div className="p-4 bg-[#FAFBFB] rounded-xl border border-[#E2E8E7] flex items-center justify-center gap-2 text-[#5C6B68]">
              <Loader2 className="w-4 h-4 animate-spin text-[#074E44]" />
              <span>Verifica disponibilità record catalogo in corso...</span>
            </div>
          )}

          {catalogStats.error && <AlertBanner tone="danger">{catalogStats.error}</AlertBanner>}

          {!catalogStats.isLoading && catalogStats.totalCount !== null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7] tabular-nums">
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Veicoli Totali</span>
                <span className="text-[#074E44] font-bold font-mono text-sm">
                  {catalogStats.totalCount.toLocaleString('it-IT')}
                </span>
              </div>

              <div>
                <span className="text-[#5C6B68] block text-[11px]">Marche Riconosciute</span>
                <span className="text-[#1A2322] font-bold font-mono text-sm">
                  {catalogStats.totalMakes || '—'}
                </span>
              </div>

              <div>
                <span className="text-[#5C6B68] block text-[11px]">Fonte Primaria</span>
                <span className="text-[#1A2322] font-semibold">Supabase PostgreSQL</span>
              </div>

              <div>
                <span className="text-[#5C6B68] block text-[11px]">Caching</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>In-Memory (10m)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sezione Aggiornamenti Desktop (Tauri v2 Updater) */}
        <div className={`${uiClasses.card} p-5 space-y-4 text-xs`}>
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F1]">
            <div className="flex items-center gap-2.5">
              <DownloadCloud className="w-5 h-5 text-[#074E44]" />
              <div>
                <h2 className="text-sm font-bold text-[#162220] uppercase tracking-wider">
                  Aggiornamenti Software In-App (Tauri v2)
                </h2>
                <p className="text-[11px] text-[#5C6B68]">
                  Download, verifica crittografica Minisign Ed25519 e installazione automatica.
                </p>
              </div>
            </div>
            <StatusBadge tone="brand">
              <span className="font-mono tabular-nums">v{currentVersion}</span>
            </StatusBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#FAFBFB] p-4 rounded-xl border border-[#E2E8E7] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#1A2322]">Stato Aggiornamenti</div>
                {updateAvailable && updateInfo ? (
                  <AlertBanner tone="success" title={`Nuova versione v${updateInfo.version} pronta`}>
                    {updateInfo.releaseNotes && (
                      <span className="line-clamp-2">{updateInfo.releaseNotes}</span>
                    )}
                  </AlertBanner>
                ) : progress.status === 'ERROR' ? (
                  <AlertBanner tone="warning" title="Stato Controllo">
                    {progress.errorMessage || 'Autopia Manager è allineato con la versione corrente.'}
                  </AlertBanner>
                ) : (
                  <div className="bg-white border border-[#E2E8E7] text-[#3F4E4B] p-3 rounded-lg text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Autopia Manager è aggiornato alla versione più recente (v{currentVersion}).
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  variant="primary"
                  size="xs"
                  className="flex-1"
                  onClick={() => checkForUpdates(true)}
                  loading={isChecking}
                  disabled={progress.status === 'DOWNLOADING' || progress.status === 'INSTALLING'}
                >
                  {!isChecking && <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{isChecking ? 'Controllo in corso...' : 'Controlla Aggiornamenti'}</span>
                </Button>

                {updateAvailable && (
                  <>
                    <Button variant="success" size="xs" onClick={startInstall}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Aggiorna Ora</span>
                    </Button>
                    <Button variant="secondary" size="xs" onClick={postponeUpdate}>
                      Rimanda
                    </Button>
                  </>
                )}

                {progress.status === 'READY_TO_RELAUNCH' && (
                  <Button variant="primary" size="xs" onClick={relaunch}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Riavvia Ora</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-[#FAFBFB] p-4 rounded-xl border border-[#E2E8E7] space-y-3">
              <div className="text-xs font-bold text-[#1A2322]">
                Preferenze Controllo Automatico
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCheckEnabled}
                  onChange={(e) => setAutoCheckEnabled(e.target.checked)}
                  className="mt-0.5 rounded border-[#C6DFDA] text-[#074E44] focus:ring-[#074E44]"
                />
                <span className="text-[11px] text-[#3F4E4B] leading-snug">
                  Verifica automaticamente nuovi aggiornamenti all'avvio del gestionale e periodicamente in background.
                </span>
              </label>

              {autoCheckEnabled && (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#5C6B68]">Frequenza controllo:</span>
                  <select
                    value={checkIntervalHours}
                    onChange={(e) => setCheckIntervalHoursPreference(Number(e.target.value))}
                    className={`${uiClasses.select} w-auto py-1 px-2 text-[11px]`}
                  >
                    <option value={2}>Ogni 2 ore</option>
                    <option value={4}>Ogni 4 ore (consigliato)</option>
                    <option value={12}>Ogni 12 ore</option>
                    <option value={24}>Una volta al giorno</option>
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E8E7] text-[10px] text-[#5C6B68] space-y-1">
                <div>
                  Endpoint: <span className="font-mono text-[#1A2322]">GitHub Releases latest.json</span>
                </div>
                <div>
                  Firma:{' '}
                  <span className="font-mono text-emerald-700 font-semibold">
                    Minisign Ed25519 Verified
                  </span>
                </div>
                <div>
                  Installazione Windows:{' '}
                  <span className="font-mono text-[#074E44] font-semibold">
                    Passive (senza interazione manuale)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <AlertBanner tone="info">
            <strong>Separazione Dati vs Eseguibile:</strong> Il database Autopia risiede su
            Supabase. Gli aggiornamenti aggiornano solo l'eseguibile Windows senza modificare le configurazioni o i dati nel cloud.
          </AlertBanner>
        </div>

        {/* Sezione Sicurezza Ruoli */}
        <div className={`${uiClasses.card} p-5 space-y-4 text-xs`}>
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F1]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#074E44]" />
              <div>
                <h2 className="text-sm font-bold text-[#162220] uppercase tracking-wider">
                  Sicurezza Ruoli & Privilegi Master
                </h2>
                <p className="text-[11px] text-[#5C6B68]">
                  Controllo accessi e funzioni amministrative della piattaforma.
                </p>
              </div>
            </div>
            <StatusBadge tone="brand">Solo SuperAdmin</StatusBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7] space-y-2">
              <div className="text-[11px] font-bold text-[#074E44]">Account Master Designato</div>
              <div className="font-mono text-xs text-[#074E44] bg-[#EAF3F1] border border-[#C6DFDA] p-2 rounded-lg font-semibold">
                {ADMIN_EMAIL}
              </div>
              <p className="text-[11px] text-[#5C6B68] leading-relaxed">
                Tutte le funzionalità amministrative (connessione backend, approvazione venditori,
                diagnostica eBay) sono assegnate esclusivamente a questo indirizzo email.
              </p>
            </div>

            <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7] space-y-2">
              <div className="text-[11px] font-bold text-[#074E44]">
                Protezione Backend & Isolamento RLS
              </div>
              <p className="text-[11px] text-[#5C6B68] leading-relaxed">
                Le policy Row Level Security (RLS) garantiscono che ogni autodemolitore operi
                esclusivamente sul proprio profilo associato a <code className="font-mono">auth.uid()</code>.
              </p>
              <div className="text-[10px] text-[#5C6B68] font-mono">
                Ruoli sessione: [{userRoles.join(', ') || 'admin'}]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
