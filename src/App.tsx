import React, { useState } from 'react';
import {
  DesktopShell,
  DesktopSection,
} from './components/desktop/DesktopShell';
import {
  Wrench,
  CheckCircle2,
  FolderGit2,
  FileCode2,
  Cpu,
  Terminal,
  Database,
  Info,
  Car,
  Package,
  Store,
  FileSpreadsheet,
  Settings,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<DesktopSection>('dashboard');
  const [backendConfigured, setBackendConfigured] = useState<boolean>(false);

  return (
    <DesktopShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      backendConnected={backendConfigured}
      statusMessage={
        backendConfigured
          ? 'Connessione verificata a Supabase'
          : 'Fase 1 completata: Struttura Desktop Tauri 2 e ambiente di compilazione verificati'
      }
    >
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Banner Intestazione Fase 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                FASE 1 COMPLETATA
              </span>
              <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <span>Autopia Manager — Struttura Desktop Windows</span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Architettura software per autodemolitori basata su <strong className="text-slate-200">Tauri 2</strong> e <strong className="text-slate-200">React 19 / Vite</strong>. Repository e codice completamente separati dal marketplace online.
            </p>
          </div>

          <div className="text-right text-xs text-slate-400 space-y-1">
            <div className="text-slate-300 font-medium">Target compilazione:</div>
            <div className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
              Windows x64 (.exe / .msi)
            </div>
          </div>
        </div>

        {/* Sezione Dashboard / Stato Architettura */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Checklist Validazione Architettura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Core Desktop
                  </span>
                  <Cpu className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-slate-100">Tauri 2.x</div>
                <p className="text-xs text-slate-400">
                  Motore nativo WebView2 di Windows, footprint di memoria ridotto e controlli finestra personalizzati.
                </p>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 pt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Configurazione src-tauri pronta</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Generazione Installer
                  </span>
                  <FolderGit2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-lg font-bold text-slate-100">GitHub Actions</div>
                <p className="text-xs text-slate-400">
                  Workflow CI/CD su runner Windows nativo (`windows-latest`) per creare automaticamente il setup (.msi e .exe).
                </p>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 pt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Workflow .github configurato</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Sicurezza & Database
                  </span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-slate-100">Zero Credenziali Segrete</div>
                <p className="text-xs text-slate-400">
                  Nessuna chiave service_role salvata. Nessun DB fittizio o migrazione remota eseguita alla cieca.
                </p>
                <div className="flex items-center space-x-1.5 text-xs text-amber-400 pt-1 font-medium">
                  <Info className="w-3.5 h-3.5" />
                  <span>In attesa di schema Supabase reale</span>
                </div>
              </div>
            </div>

            {/* Dettagli File e Componenti Generati */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-amber-400" />
                <span>Struttura del Progetto Desktop Creata</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded border border-slate-800/80 space-y-1.5 text-slate-300">
                  <div className="font-semibold text-amber-400 mb-2">Cartella src-tauri/ (Core Rust & Config)</div>
                  <div>├── Cargo.toml <span className="text-slate-500">// Dipendenze Rust (tauri v2.1, serde)</span></div>
                  <div>├── tauri.conf.json <span className="text-slate-500">// Finestra 1320x840, bundle nsis/msi</span></div>
                  <div>├── build.rs <span className="text-slate-500">// Script di build Tauri</span></div>
                  <div>├── src/main.rs <span className="text-slate-500">// Entrypoint Windows subsystem</span></div>
                  <div>└── capabilities/default.json <span className="text-slate-500">// Permessi controlli finestra</span></div>
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800/80 space-y-1.5 text-slate-300">
                  <div className="font-semibold text-amber-400 mb-2">Automazione Build & Frontend</div>
                  <div>├── .github/workflows/build-windows.yml <span className="text-slate-500">// CI/CD Windows runner</span></div>
                  <div>├── src/utils/tauriWindow.ts <span className="text-slate-500">// Bridge finestra nativa</span></div>
                  <div>├── src/components/desktop/TitleBar.tsx <span className="text-slate-500">// Titlebar nativa drag</span></div>
                  <div>├── src/components/desktop/StatusBar.tsx <span className="text-slate-500">// Stato connessione reale</span></div>
                  <div>└── src/components/desktop/DesktopShell.tsx <span className="text-slate-500">// Shell layout gestionale</span></div>
                </div>
              </div>
            </div>

            {/* Come generare l'eseguibile Windows */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Come ottenere il file di installazione (.msi / .exe)</span>
              </h2>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  Come confermato, Google AI Studio lavora in ambiente Linux cloud e valida l'intera logica TypeScript, React e la configurazione Tauri. Per produrre il binario Windows:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-2">
                  <li>
                    <strong className="text-slate-200">Tramite GitHub (Automatico):</strong> Creando un repository dedicato per questo gestionale e caricando il codice, il file <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">.github/workflows/build-windows.yml</code> avvierà una macchina virtuale Windows su GitHub e ti renderà scaricabile direttamente il file di setup.
                  </li>
                  <li>
                    <strong className="text-slate-200">Sul tuo computer locale:</strong> Eseguendo semplicemente <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">npm run tauri build</code> su qualsiasi PC Windows con Rust installato.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Anteprima Sezione Veicoli (Fase 2) */}
        {activeSection === 'vehicles' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <Car className="w-6 h-6" />
              <h2 className="text-lg font-bold text-slate-100">Modulo Parco Veicoli Demoliti</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Questo modulo permetterà la registrazione dei veicoli in ingresso, targa, telaio (VIN), marca, modello, anno, codice motore e stato bonifica/demolizione.
            </p>
            <div className="bg-amber-950/20 border border-amber-800/40 rounded p-4 text-xs text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>In attesa di verifica schema (Fase 2):</strong> Prima di creare campi rigidi, verificheremo se nel backend Supabase di Autopia esiste già una tabella dedicata ai veicoli o se i ricambi sono associati a marche/modelli in formato standard.
              </div>
            </div>
          </div>
        )}

        {/* Anteprima Sezione Magazzino e Ricambi (Fase 2) */}
        {activeSection === 'parts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <Package className="w-6 h-6" />
              <h2 className="text-lg font-bold text-slate-100">Magazzino & Gestione Ricambi</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gestione completa dei pezzi di ricambio smontati, categorizzazione, codici OEM originali, stato di usura (grado A/B/C), prezzo consigliato e <strong className="text-slate-200">posizione fisica nel magazzino</strong> (settore, corsia, scaffale, ripiano).
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded p-4 text-xs text-slate-400">
              Il sistema integrerà la ricerca istantanea locale e i filtri di giacenza per l'autodemolitore.
            </div>
          </div>
        )}

        {/* Anteprima Sezione Annunci (Fase 2 / 3) */}
        {activeSection === 'listings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <Store className="w-6 h-6" />
              <h2 className="text-lg font-bold text-slate-100">Annunci Marketplace Autopia (autopiashop.it)</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Controllo dello stato di pubblicazione dei ricambi sul marketplace pubblico.
            </p>
            <div className="bg-blue-950/20 border border-blue-800/40 rounded p-4 text-xs text-blue-300">
              <strong>Regola di integrità:</strong> Nessun annuncio verrà mostrato come pubblicato senza l'esplicita conferma di risposta dal server Supabase di Autopia.
            </div>
          </div>
        )}

        {/* Anteprima Sezione Importazione CSV (Fase 2) */}
        {activeSection === 'import' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
              <h2 className="text-lg font-bold text-slate-100">Importazione CSV Ricambi & Giacenze</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Permette di caricare in blocco inventari già esistenti in formato CSV/Excel (ad esempio da altri software gestionali di demolizione o file fornitore), con mappatura automatica delle colonne (Codice, Descrizione, Veicolo, Posizione, Prezzo).
            </p>
          </div>
        )}

        {/* Sezione Connessione Backend & Autenticazione (Fase 3) */}
        {activeSection === 'settings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-5">
            <div className="flex items-center space-x-3 text-amber-400">
              <Settings className="w-6 h-6" />
              <h2 className="text-lg font-bold text-slate-100">Configurazione Connessione Supabase</h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Qui l'autodemolitore effettuerà il login con le credenziali del proprio account venditore registrato su <strong className="text-slate-200">autopiashop.it</strong>.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
              <div className="font-semibold text-slate-300">Parametri di Collegamento Client:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">URL Progetto Supabase</label>
                  <input
                    type="text"
                    disabled
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">Verrà impostato nella Fase 3 con i dati reali del progetto.</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Chiave Pubblica (anon key)</label>
                  <input
                    type="text"
                    disabled
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">Solo chiave pubblica client (nessuna chiave service_role).</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-xs text-amber-300 flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Nessuna operazione di scrittura o simulazione fittizia verrà eseguita finché non analizzeremo lo schema del database Supabase nella fase dedicata.
              </span>
            </div>
          </div>
        )}
      </div>
    </DesktopShell>
  );
}
