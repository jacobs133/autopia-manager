import React, { useState } from 'react';
import {
  Lock,
  Mail,
  LogIn,
  Settings,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BackendConfigModal } from './BackendConfigModal';
import { AutopiaLogo, AlertBanner, Button, uiClasses } from '../ui/DesignSystem';
import { openExternalUrl } from '../../services/externalLinkService';

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
      setLocalError('Inserisci l\'indirizzo email.');
      return;
    }
    if (!password) {
      setLocalError('Inserisci la password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setLocalError(result.error || 'Credenziali non valide o accesso non autorizzato.');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Errore imprevisto durante l\'accesso.');
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
    <div className="flex-1 flex items-center justify-center p-6 bg-[#F5F7F7] font-sans">
      <div className="w-full max-w-[420px] bg-white border border-[#E2E8E7] rounded-2xl shadow-[0_8px_28px_rgba(7,78,68,0.06)] p-8 space-y-6">
        {/* Intestazione Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <AutopiaLogo size="lg" subtitle="MANAGER" />
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-[#1A2322] tracking-tight">
              Accedi al tuo gestionale
            </h1>
            <p className="text-xs text-[#5C6B68] leading-relaxed">
              Gestisci veicoli, magazzino ricambi e ordini collegati ad{' '}
              <button
                type="button"
                onClick={() => openExternalUrl('https://autopiashop.it')}
                className="text-[#074E44] font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>autopiashop.it</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </p>
          </div>
        </div>

        {/* Avviso Configurazione Mancante */}
        {isConfigMissing && (
          <AlertBanner
            tone="warning"
            title="Connessione backend non configurata"
            action={
              <Button size="xs" variant="primary" onClick={handleOpenConfig}>
                <Settings className="w-3.5 h-3.5" />
                <span>Configura</span>
              </Button>
            }
          >
            Imposta l'URL del progetto e la chiave pubblica prima di effettuare l'accesso.
          </AlertBanner>
        )}

        {/* Errore Autenticazione */}
        {(localError || (errorMessage && status !== 'UNCONFIGURED')) && (
          <AlertBanner tone="danger">
            {localError || errorMessage}
          </AlertBanner>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={uiClasses.label}>Email aziendale</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8B88]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@autodemolizione.it"
                disabled={isConfigMissing || isSubmitting}
                required
                className={`${uiClasses.input} pl-9 py-2.5`}
              />
            </div>
          </div>

          <div>
            <label className={uiClasses.label}>Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8B88]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password"
                disabled={isConfigMissing || isSubmitting}
                required
                className={`${uiClasses.input} pl-9 py-2.5`}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            disabled={isConfigMissing || isSubmitting}
            className="w-full py-2.5 text-[13px]"
          >
            {!isSubmitting && <LogIn className="w-4 h-4" />}
            <span>{isSubmitting ? 'Accesso in corso...' : 'Accedi'}</span>
          </Button>
        </form>

        {/* Footer Sicurezza e Impostazioni Connessione */}
        <div className="pt-4 border-t border-[#EEF2F1] space-y-2.5 text-[11px] text-[#5C6B68]">
          <div className="flex items-center gap-1.5 text-[#074E44] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Accesso protetto con le tue credenziali Autopia</span>
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            {config ? (
              <span className="truncate max-w-[230px] text-[#748481]">
                Server configurato
              </span>
            ) : (
              <span className="text-amber-700">Server non configurato</span>
            )}
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="text-[#074E44] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>{config ? 'Modifica server' : 'Configura server'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modale di configurazione parametri Supabase */}
      <BackendConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};
