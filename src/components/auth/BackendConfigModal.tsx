import React, { useState, useEffect } from 'react';
import {
  Database,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testBackendConnection,
  validateSupabaseCredentials,
} from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { refreshAuth } = useAuth();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isFromEnv, setIsFromEnv] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      if (cfg) {
        setUrl(cfg.url);
        setAnonKey(cfg.anonKey);
        setIsFromEnv(cfg.isFromEnv);
      } else {
        setUrl('');
        setAnonKey('');
        setIsFromEnv(false);
      }
      setTestResult(null);
      setSaveError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setSaveError(null);
    setTestResult(null);

    const validation = validateSupabaseCredentials(url, anonKey);
    if (!validation.valid) {
      setTestResult({
        success: false,
        message: validation.error || 'Parametri non validi',
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
        message: err?.message || 'Errore imprevisto durante il test di connessione',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const validation = validateSupabaseCredentials(url, anonKey);
    if (!validation.valid) {
      setSaveError(validation.error || 'Credenziali non valide');
      return;
    }

    setIsSaving(true);
    try {
      const saveRes = saveSupabaseConfig(url, anonKey);
      if (!saveRes.success) {
        setSaveError(saveRes.error || 'Errore durante il salvataggio locale');
        setIsSaving(false);
        return;
      }

      await refreshAuth();
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setSaveError(err?.message || 'Errore durante l\'aggiornamento della connessione');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setIsFromEnv(false);
    setTestResult(null);
    setSaveError(null);
    await refreshAuth();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Intestazione */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Configurazione Connessione Backend
              </h2>
              <p className="text-[11px] text-slate-400">
                Imposta i parametri del progetto Supabase di Autopia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo modale */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Box Sicurezza Chiave Pubblica */}
          <div className="p-3 bg-amber-950/25 border border-amber-800/40 rounded-lg text-xs text-amber-300 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Connessione Diretta Supabase Auth & RLS</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Autopia Manager necessita solo dell'<strong>URL del progetto</strong> e della <strong>chiave pubblica anon</strong> (non inserire mai la chiave segreta <em>service_role</em>).
            </p>
          </div>

          {/* Form */}
          <form id="backend-config-form" onSubmit={handleSave} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block flex items-center justify-between">
                <span>URL Progetto Supabase</span>
                <span className="text-[10px] text-slate-500 font-mono">https://*.supabase.co</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefghijklmnopq.supabase.co"
                required
                disabled={isFromEnv || isSaving}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chiave Pubblica Anon (anon / public)</span>
                </span>
                <span className="text-[10px] text-slate-500">JWT Token Pubblico</span>
              </label>
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                required
                disabled={isFromEnv || isSaving}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs break-all disabled:opacity-60 resize-none"
              />
            </div>

            {/* Guida integrata espandibile */}
            <div className="border border-slate-800 rounded-lg bg-slate-950/40 p-2.5">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-1.5 font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dove trovo questi parametri nella dashboard Supabase?</span>
                </span>
                <span className="text-xs font-mono">{showHelp ? '▲' : '▼'}</span>
              </button>

              {showHelp && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 space-y-2">
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Accedi alla console di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline inline-flex items-center space-x-0.5"><span>Supabase</span><ExternalLink className="w-2.5 h-2.5" /></a> e seleziona il progetto di Autopia.</li>
                    <li>Clicca sull'icona delle <strong>Project Settings</strong> (in basso a sinistra).</li>
                    <li>Vai alla sezione <strong>API</strong>.</li>
                    <li>Copia il valore sotto <strong>Project URL</strong> e incollalo nel primo campo.</li>
                    <li>Sotto <strong>Project API Keys</strong>, copia la chiave etichettata come <code className="text-amber-300 font-mono bg-slate-900 px-1 py-0.5 rounded">anon / public</code> e incollala nel secondo campo.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Risultato Test Connessione */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200'
                    : 'bg-red-950/40 border border-red-800/60 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {testResult.success ? 'Connessione verificata con successo' : 'Test di connessione non riuscito'}
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* Errore di salvataggio */}
            {saveError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer azioni */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {url && !isFromEnv && (
              <button
                type="button"
                onClick={handleReset}
                title="Cancella parametri locali"
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="submit"
              form="backend-config-form"
              disabled={isSaving || !url || !anonKey}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva e Connetti</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
