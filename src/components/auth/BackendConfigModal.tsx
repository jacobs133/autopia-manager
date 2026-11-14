import React, { useState, useEffect } from 'react';
import {
  Database,
  KeyRound,
  Save,
  RefreshCw,
  X,
  ExternalLink,
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
import { AlertBanner, Button, uiClasses } from '../ui/DesignSystem';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10201E]/45 backdrop-blur-[2px] font-sans">
      <div className="w-full max-w-lg bg-white border border-[#E2E8E7] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Intestazione */}
        <div className="px-5 py-4 border-b border-[#E2E8E7] flex items-center justify-between bg-[#FAFBFB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3F1] text-[#074E44] flex items-center justify-center">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A2322]">
                Configurazione Connessione Backend
              </h2>
              <p className="text-xs text-[#5C6B68]">
                Imposta i parametri del progetto Supabase di Autopia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5C6B68] hover:text-[#1A2322] hover:bg-[#EDF2F1] rounded-lg transition-colors cursor-pointer"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo modale */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <AlertBanner tone="info" title="Chiave pubblica di progetto">
            Inserisci soltanto l'<strong>URL del progetto</strong> e la <strong>chiave pubblica anon</strong> (non utilizzare mai chiavi private <em>service_role</em>).
          </AlertBanner>

          <form id="backend-config-form" onSubmit={handleSave} className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#2E3C3A]">
                  URL Progetto Supabase
                </label>
                <span className="text-[11px] text-[#748481] font-mono">https://*.supabase.co</span>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefghijklmnopq.supabase.co"
                required
                disabled={isFromEnv || isSaving}
                className={`${uiClasses.input} font-mono`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#2E3C3A] flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#074E44]" />
                  <span>Chiave Pubblica Anon (anon / public)</span>
                </label>
                <span className="text-[11px] text-[#748481]">Token pubblico</span>
              </div>
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                required
                disabled={isFromEnv || isSaving}
                className={`${uiClasses.textarea} font-mono break-all resize-none`}
              />
            </div>

            {/* Guida rapida */}
            <div className="border border-[#E2E8E7] rounded-xl bg-[#F7FAF9] p-3">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between text-xs text-[#2E3C3A] hover:text-[#074E44] transition-colors cursor-pointer font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#074E44]" />
                  <span>Dove trovare questi parametri in Supabase</span>
                </span>
                <span className="text-[11px] font-mono text-[#5C6B68]">{showHelp ? 'Nascondi' : 'Mostra'}</span>
              </button>

              {showHelp && (
                <ol className="mt-2.5 pt-2.5 border-t border-[#E2E8E7] list-decimal list-inside space-y-1 text-[11px] text-[#5C6B68] leading-relaxed">
                  <li>
                    Accedi a{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#074E44] font-medium hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Supabase</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    e seleziona il progetto Autopia.
                  </li>
                  <li>Apri <strong>Project Settings</strong> e seleziona <strong>API</strong>.</li>
                  <li>Copia il valore <strong>Project URL</strong> nel primo campo.</li>
                  <li>Copia la chiave pubblica <strong>anon / public</strong> nel secondo campo.</li>
                </ol>
              )}
            </div>

            {testResult && (
              <AlertBanner
                tone={testResult.success ? 'success' : 'danger'}
                title={testResult.success ? 'Connessione verificata' : 'Test non riuscito'}
              >
                {testResult.message}
              </AlertBanner>
            )}

            {saveError && (
              <AlertBanner tone="danger">{saveError}</AlertBanner>
            )}
          </form>
        </div>

        {/* Footer azioni */}
        <div className="px-5 py-3.5 border-t border-[#E2E8E7] bg-[#FAFBFB] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isTesting}
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
            >
              {!isTesting && <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Test in corso...' : 'Testa connessione'}</span>
            </Button>

            {url && !isFromEnv && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Cancella parametri locali"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 px-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Annulla
            </Button>

            <Button
              type="submit"
              form="backend-config-form"
              variant="primary"
              size="sm"
              loading={isSaving}
              disabled={isSaving || !url || !anonKey}
            >
              {!isSaving && <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Salvataggio...' : 'Salva e connetti'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
