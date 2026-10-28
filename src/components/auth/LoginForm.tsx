import React, { useState } from 'react';
import {
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  Loader2,
  Wrench,
  Settings,
  ShieldCheck,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BackendConfigModal } from './BackendConfigModal';

interface LoginFormProps {
  onOpenSettings?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onOpenSettings }) => {
  const { login, status, errorMessage, config } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Inserisci l\'indirizzo email');
      return;
    }
    if (!password) {
      setLocalError('Inserisci la password');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setLocalError(result.error || 'Autenticazione fallita');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Errore imprevisto durante l\'accesso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfigMissing = status === 'UNCONFIGURED';

  const handleOpenConfig = () => {
    setIsConfigModalOpen(true);
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-7 space-y-6">
        {/* Logo e Titolo Applicazione */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase">
            AUTOPIA <span className="text-amber-400 font-extrabold">MANAGER</span>
          </h1>
          <p className="text-xs text-slate-400">
            Software gestionale desktop per autodemolitori accreditati su{' '}
            <a
              href="https://autopiashop.it"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline inline-flex items-center space-x-0.5"
            >
              <span>autopiashop.it</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>

        {/* Avviso Configurazione Mancante */}
        {isConfigMissing && (
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3.5 space-y-2 text-xs text-amber-300">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Connessione Backend non configurata</strong>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Prima di poter effettuare il login, è necessario impostare l'URL del progetto Supabase di Autopia e la chiave pubblica anon.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenConfig}
              className="w-full mt-2 flex items-center justify-center space-x-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configura Parametri Connessione</span>
            </button>
          </div>
        )}

        {/* Messaggio di Errore Globale o Locale */}
        {(localError || (errorMessage && status !== 'UNCONFIGURED')) && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-3 text-xs text-red-200 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              {localError || errorMessage}
            </div>
          </div>
        )}

        {/* Form di Accesso con Email e Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Indirizzo Email Autodemolitore
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@autodemolizione.it"
                disabled={isConfigMissing || isSubmitting}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isConfigMissing || isSubmitting}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isConfigMissing || isSubmitting}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifica credenziali in corso...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Accedi ad Autopia Manager</span>
              </>
            )}
          </button>
        </form>

        {/* Note di Sicurezza ed Integrità */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Autenticazione diretta Supabase Auth con crittografia end-to-end</span>
          </div>
          <div className="flex items-start space-x-1.5 text-slate-400">
            <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Nessuna password o chiave riservata viene memorizzata in chiaro nel computer. Utilizza le stesse credenziali con cui gestisci i tuoi ricambi su Autopia.
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
            {config ? (
              <>
                <span className="truncate max-w-[220px]">
                  Endpoint: <code className="text-slate-300 font-mono">{config.url}</code>
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Modifica Server</span>
                </button>
              </>
            ) : (
              <>
                <span className="text-amber-400/80">Nessun backend connesso</span>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Configura Supabase</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modale di configurazione parametri Supabase per Desktop */}
      <BackendConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};
