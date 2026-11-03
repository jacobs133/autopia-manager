import React, { useState, useEffect } from 'react';
import {
  Database,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
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
import {
  ADMIN_EMAIL,
} from '../../services/partsService';
import { useAuth } from '../../contexts/AuthContext';

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
    isTauri,
  } = useUpdate();

  // Controllo di sicurezza: accessibile ESCLUSIVAMENTE all'amministratore master
  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950 font-sans text-slate-100 min-h-[60vh]">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/80 rounded-2xl p-7 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Accesso Riservato all'Amministratore</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              La configurazione della connessione backend, i parametri Supabase e la gestione della sicurezza ruoli e privilegi master sono accessibili esclusivamente all'account amministratore autorizzato (<strong className="text-purple-300 font-mono">{ADMIN_EMAIL}</strong>).
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-500 font-mono">
            Politica di sicurezza Autopia • Accesso non autorizzato interdetto
          </div>
        </div>
      </div>
    );
  }

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

  // Stato verifica catalogo centrale
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
    const cfg = getSupabaseConfig();
    if (cfg) {
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setIsFromEnv(cfg.isFromEnv);
      checkCatalog();
    }
  }, []);

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
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Errore durante la verifica di rete',
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

  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Intestazione */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-400" />
            <span>Configurazione Connessione Supabase</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Imposta i parametri di collegamento al backend di produzione o staging di{' '}
            <strong className="text-slate-200">autopiashop.it</strong>.
          </p>
        </div>

        {/* Badge Stato Connessione Reale */}
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Stato del Client:</div>
          <div className="mt-0.5">
            {status === 'UNCONFIGURED' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Non Configurato</span>
              </span>
            )}
            {status === 'UNAUTHENTICATED' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">
                <Server className="w-3.5 h-3.5" />
                <span>Configurato • Login Necessario</span>
              </span>
            )}
            {status === 'AUTHENTICATED_APPROVED' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connesso & Autenticato ({sellerProfile?.business_name})</span>
              </span>
            )}
            {status.startsWith('AUTHENTICATED_') && status !== 'AUTHENTICATED_APPROVED' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Autenticato • Non Approvato</span>
              </span>
            )}
            {status === 'NETWORK_ERROR' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-red-950/60 text-red-300 border border-red-800/60">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Errore di Rete</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Regola di Sicurezza Fondamentale */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-lg p-4 text-xs space-y-2">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Regola di Sicurezza: Solo Chiavi Pubbliche (Anon / Publishable)</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          Inserisci <strong>esclusivamente la chiave pubblica anonima</strong> del progetto Supabase di Autopia. Non inserire MAI la chiave <code className="bg-slate-950 text-red-400 px-1 py-0.5 rounded font-mono">service_role</code> o chiavi private con privilegi amministrativi: il gestionale desktop opera sotto le policy di sicurezza Row Level Security (RLS) dell'autodemolitore autenticato.
        </p>
      </div>

      {/* Feedback Operazioni */}
      {saveFeedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center space-x-2 ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-200'
              : 'bg-red-950/50 border border-red-800/60 text-red-200'
          }`}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{saveFeedback.message}</span>
        </div>
      )}

      {/* Esito Test Connessione */}
      {testResult && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-start space-x-2.5 ${
            testResult.success
              ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-200'
              : 'bg-red-950/50 border border-red-800/60 text-red-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold">
              {testResult.success ? 'Connessione Riuscita' : 'Test di Connessione Fallito'}
            </div>
            <div className="mt-0.5 text-slate-300">{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Modulo di Configurazione */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 text-xs">
        {isFromEnv && (
          <div className="bg-blue-950/30 border border-blue-800/50 p-2.5 rounded text-blue-300 flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Configurazione caricata dalle variabili d'ambiente di compilazione (.env).</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-slate-300 font-semibold block">
            URL Progetto Supabase Autopia
          </label>
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzabcdefghijklmnopq.supabase.co"
              required
              disabled={isFromEnv}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-[11px] text-slate-500 block">
            Disponibile nella console Supabase di Autopia in <strong>Project Settings → API → Project URL</strong>.
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-300 font-semibold block flex items-center justify-between">
            <span>Chiave Pubblica Anon / Publishable Key</span>
            <span className="text-slate-500 font-normal">Nessun token segreto</span>
          </label>
          <div className="relative">
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              disabled={isFromEnv}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-[11px] text-slate-500 block">
            Disponibile nella console Supabase in <strong>Project Settings → API → Project API Keys → anon / public</strong>.
          </span>
        </div>

        {/* Pulsanti Azione */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !url || !anonKey}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Test in corso...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Testa Connessione</span>
                </>
              )}
            </button>

            {!isFromEnv && (
              <button
                type="submit"
                disabled={!url || !anonKey}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salva Parametri</span>
              </button>
            )}
          </div>

          {!isFromEnv && url && (
            <div className="flex items-center space-x-2">
              {showClearConfirm ? (
                <div className="flex items-center space-x-1.5 bg-red-950/40 p-1 rounded border border-red-800/60">
                  <span className="text-[11px] text-red-300 font-medium px-1">Confermi?</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Sì, Rimuovi
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded font-medium flex items-center space-x-1 transition-colors cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Rimuovi Configurazione</span>
                </button>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Profilo Autenticato Attuale se presente */}
      {user && sellerProfile && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 text-xs">
          <div className="font-semibold text-slate-200 flex items-center justify-between">
            <span>Sessione Autenticata Attiva</span>
            <span className="text-emerald-400 font-mono text-[11px] font-normal">
              Status: {sellerProfile.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded border border-slate-800/80">
            <div>
              <span className="text-slate-500 block">Azienda:</span>
              <span className="text-slate-200 font-medium">{sellerProfile.business_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Partita IVA:</span>
              <span className="text-slate-200 font-medium">{sellerProfile.vat_number || 'Non specificata'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Città:</span>
              <span className="text-slate-200 font-medium">{sellerProfile.city} ({sellerProfile.province || ''})</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email Utente:</span>
              <span className="text-slate-200 font-medium">{user.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ID Venditore (seller_id):</span>
              <span className="text-slate-400 font-mono text-[10px] truncate block">{sellerProfile.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stato Banca Dati Catalogo Veicoli Centrale (public.vehicles) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
              Stato Banca Dati Catalogo Centrale (`public.vehicles`)
            </span>
          </div>

          <button
            type="button"
            onClick={() => checkCatalog(true)}
            disabled={catalogStats.isLoading}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${catalogStats.isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Svuota Cache & Verifica Live</span>
          </button>
        </div>

        <p className="text-slate-400 text-[11px] leading-relaxed">
          Autopia Manager interroga la tabella <code className="text-slate-300">public.vehicles</code> con paginazione batch da 1.000 record per garantire che tutte le 45 marche, 332 modelli e oltre 11.000 varianti siano pienamente disponibili senza troncamenti né duplicati.
        </p>

        {catalogStats.isLoading && (
          <div className="p-4 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-center space-x-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Verifica disponibilità record catalogo in corso...</span>
          </div>
        )}

        {catalogStats.error && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{catalogStats.error}</span>
          </div>
        )}

        {!catalogStats.isLoading && catalogStats.totalCount !== null && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded border border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px]">Veicoli Totali nel Database:</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {catalogStats.totalCount.toLocaleString('it-IT')}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">Marche Ufficiali Riconosciute:</span>
              <span className="text-amber-400 font-bold font-mono text-sm">
                {catalogStats.totalMakes || '—'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">Fonte Primaria:</span>
              <span className="text-slate-200 font-medium">Supabase PostgreSQL</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">Strategia di Caching:</span>
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>In-Memory (TTL 10m)</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sezione Aggiornamenti & Versionamento Desktop (Tauri v2 Updater) */}
      <div className="bg-slate-900 border border-blue-500/30 rounded-lg p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <DownloadCloud className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Aggiornamenti & Versionamento Software (Tauri v2 Updater)
              </h2>
              <p className="text-[11px] text-slate-400">
                Sistema crittografico ufficiale per il rilascio e la ricezione di nuove versioni Windows desktop.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800/80 px-2.5 py-1 rounded">
            v{currentVersion}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-200 flex items-center space-x-1.5">
              <span>Canale di Distribuzione</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 break-all select-all">
              https://github.com/jacobs133/autopia-manager/releases/latest/download/latest.json
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Le nuove release Windows vengono firmate crittograficamente con chiave privata Minisign (Ed25519) prima di essere pubblicate su GitHub Releases.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-200">
                Stato Aggiornamenti
              </div>
              {updateAvailable && updateInfo ? (
                <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 p-2.5 rounded text-[11px] space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nuova versione v{updateInfo.version} disponibile!</span>
                  </div>
                  {updateInfo.releaseNotes && (
                    <div className="text-[10px] text-slate-300 italic line-clamp-2">
                      {updateInfo.releaseNotes}
                    </div>
                  )}
                </div>
              ) : progress.status === 'ERROR' ? (
                <div className="bg-red-950/50 border border-red-800/70 text-red-300 p-2.5 rounded text-[11px] space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Nessuna release trovata o errore di controllo</span>
                  </div>
                  <div className="text-[10px] text-slate-300 leading-relaxed">
                    {progress.errorMessage || 'Verifica che la Release sia stata pubblicata su GitHub e che il repository sia accessibile.'}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 text-slate-400 p-2.5 rounded text-[11px] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Autopia Manager è aggiornato alla versione locale (v{currentVersion}).</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => checkForUpdates(true)}
                disabled={isChecking || progress.status === 'DOWNLOADING' || progress.status === 'INSTALLING'}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded text-xs transition"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Controllo in corso...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verifica Nuova Versione</span>
                  </>
                )}
              </button>

              {updateAvailable && progress.status === 'IDLE' && (
                <button
                  onClick={startInstall}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 px-3 rounded text-xs transition flex items-center space-x-1"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Scarica e Installa</span>
                </button>
              )}

              {progress.status === 'READY_TO_RELAUNCH' && (
                <button
                  onClick={relaunch}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-1.5 px-3 rounded text-xs transition flex items-center space-x-1 animate-pulse"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Riavvia Ora</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded bg-amber-950/20 border border-amber-800/40 text-amber-300 text-[11px] flex items-start space-x-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Separazione Dati vs Eseguibile:</strong> Il database di Autopia (`public.vehicles`, ricambi e annunci) è completamente autonomo e risiede su Supabase. Gli aggiornamenti software aggiornano esclusivamente i binari Windows dell'applicazione desktop senza cancellare configurazioni locali né toccare i dati nel cloud.
          </span>
        </div>
      </div>

      {/* Sezione Riservata: Sicurezza Ruoli & Privilegi Master */}
      <div className="bg-slate-900 border border-purple-500/40 rounded-lg p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Sicurezza Ruoli & Privilegi Master
              </h2>
              <p className="text-[11px] text-slate-400">
                Politiche di controllo accessi e blindatura funzioni amministrative della piattaforma.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/80 px-2.5 py-1 rounded uppercase">
            Solo SuperAdmin
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-amber-400 flex items-center space-x-1.5">
              <span>Account Master Designato</span>
            </div>
            <div className="font-mono text-xs text-purple-300 bg-purple-950/40 border border-purple-800/40 p-2 rounded">
              {ADMIN_EMAIL}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tutte le funzionalità da amministratore (connessione backend, approvazione venditori, supervisione globale) sono assegnate esclusivamente a questo indirizzo email. Nessun altro account ha accesso a queste schermate né alle chiamate privilegiate.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1.5">
              <span>Protezione Backend & Isolamento RLS</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Le policy Row Level Security (RLS) di Supabase garantiscono che ogni autodemolitore operi esclusivamente sul proprio <code className="text-slate-300">seller_id</code> associato a <code className="text-slate-300">auth.uid()</code>. L'account master supervisiona l'intera rete attraverso le stored procedure verificate del backend.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Ruoli rilevati sessione: [{userRoles.join(', ') || 'admin'}]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
