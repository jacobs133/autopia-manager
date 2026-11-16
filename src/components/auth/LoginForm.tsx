import React, { useState } from 'react';
import {
  Lock,
  Mail,
  LogIn,
  Settings,
  ShieldCheck,
  ExternalLink,
  Car,
  Package,
  Globe,
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
      setLocalError("Inserisci l'indirizzo email.");
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
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Errore imprevisto durante l'accesso.");
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
    <div className="flex-1 flex items-center justify-center p-6 bg-[#EEF2F3] tech-grid-bg font-sans">
      <div className="w-full max-w-4xl bg-white border border-[#DCE4E2] rounded-2xl shadow-[0_20px_50px_-20px_rgba(15,28,26,0.22)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Pannello sinistro: Identità industriale & moduli */}
        <div className="lg:col-span-5 bg-[#121B1A] text-white p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#253331]">
          <div className="space-y-6 relative z-10">
            <AutopiaLogo size="lg" subtitle="OPERATIONS DESKTOP" theme="dark" />

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold tracking-tight text-white leading-snug">
                Console operativa per centri di autodemolizione
              </h2>
              <p className="text-xs text-[#9AB0AC] leading-relaxed">
                Catalogazione rapida dal piazzale, controllo giacenze e sincronizzazione diretta con i canali di vendita.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1A2826] border border-[#283B38] text-[#5EEAD4] flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EEF4F2]">Magazzino Ricambi &amp; OEM</div>
                  <div className="text-[11px] text-[#8EA29E]">
                    Gestione codici, ubicazione scaffali, esportazione CSV e azioni massive.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1A2826] border border-[#283B38] text-[#5EEAD4] flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EEF4F2]">Parco Veicoli &amp; Smontaggio</div>
                  <div className="text-[11px] text-[#8EA29E]">
                    Abbinamento al catalogo tecnico ufficiale ed estrazione guidata ricambi.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1A2826] border border-[#283B38] text-[#5EEAD4] flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EEF4F2]">Canali Autopia Shop &amp; eBay</div>
                  <div className="text-[11px] text-[#8EA29E]">
                    Conferma richieste, tracking spedizioni e allineamento giacenze in tempo reale.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#22302D] text-[11px] text-[#7F9490] flex items-center justify-between relative z-10">
            <span>Ecosistema</span>
            <button
              type="button"
              onClick={() => openExternalUrl('https://autopiashop.it')}
              className="text-[#5EEAD4] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>autopiashop.it</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pannello destro: Accesso credenziali */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center space-y-6 bg-white">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-[#131C1B] tracking-tight">
              Accedi al tuo centro operativo
            </h1>
            <p className="text-xs text-[#566663]">
              Inserisci le credenziali aziendali autorizzate per aprire la sessione di lavoro.
            </p>
          </div>

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
              Imposta l&apos;URL del progetto e la chiave pubblica prima di effettuare l&apos;accesso.
            </AlertBanner>
          )}

          {(localError || (errorMessage && status !== 'UNCONFIGURED')) && (
            <AlertBanner tone="danger">{localError || errorMessage}</AlertBanner>
          )}

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
              <span>{isSubmitting ? 'Accesso in corso...' : 'Accedi a Autopia Manager'}</span>
            </Button>
          </form>

          <div className="pt-4 border-t border-[#EEF2F1] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#566663]">
            <div className="flex items-center gap-1.5 text-[#074E44] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Sessione protetta Supabase Auth</span>
            </div>

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="text-[#074E44] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>{config ? 'Impostazioni server' : 'Configura server'}</span>
            </button>
          </div>
        </div>
      </div>

      <BackendConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};
