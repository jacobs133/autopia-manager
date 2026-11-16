import React from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  DownloadCloud,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { DashboardSnapshot } from '../../services/dashboardService';
import type { DesktopSection } from './DesktopShell';
import { Button } from '../ui/DesignSystem';

interface ActivityCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: DashboardSnapshot | null;
  updateAvailable: boolean;
  updateVersion?: string;
  onOpenUpdateModal: () => void;
  onSelectSection: (section: DesktopSection) => void;
}

export const ActivityCenterDrawer: React.FC<ActivityCenterDrawerProps> = ({
  isOpen,
  onClose,
  snapshot,
  updateAvailable,
  updateVersion,
  onOpenUpdateModal,
  onSelectSection,
}) => {
  if (!isOpen) return null;

  const alerts = snapshot?.alerts || [];
  const activity = snapshot?.recentActivity || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F1615]/45 backdrop-blur-[1px] flex justify-end font-sans"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md bg-white border-l border-[#CFDAD7] h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#121B1A] text-white border-b border-[#253331] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#5EEAD4]" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Centro Notifiche & Azioni</h2>
              <p className="text-[11px] text-[#9BB0AB]">
                Avvisi operativi reali dal magazzino e dai canali di vendita
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9BB0AB] hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#F6F8F8]">
          {/* Aggiornamento software */}
          {updateAvailable && (
            <div className="p-3.5 bg-[#EAF3F1] border border-[#9CD0C6] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#074E44]">
                <DownloadCloud className="w-4 h-4" />
                <span>Aggiornamento disponibile: v{updateVersion}</span>
              </div>
              <p className="text-[11px] text-[#2E4843]">
                È pronto il pacchetto firmato per Windows. Installa direttamente dall&apos;applicazione.
              </p>
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  onClose();
                  onOpenUpdateModal();
                }}
              >
                <span>Apri aggiornamento</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Azioni Richieste */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#566663]">
                Attività che richiedono attenzione ({alerts.length})
              </h3>
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 bg-white border border-[#DCE4E2] rounded-xl flex items-center gap-3 text-xs text-[#334441]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Nessuna criticità aperta. Magazzino e ordini risultano aggiornati.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((al) => {
                  const toneStyle =
                    al.severity === 'critical'
                      ? 'bg-red-50/80 border-red-200 text-red-950'
                      : al.severity === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                      : 'bg-white border-[#DCE4E2] text-[#131C1B]';

                  const icon =
                    al.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : al.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-[#074E44] shrink-0 mt-0.5" />
                    );

                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => {
                        onSelectSection(al.targetSection);
                        onClose();
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all hover:shadow-xs flex items-start justify-between gap-3 cursor-pointer ${toneStyle}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {icon}
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-bold">{al.title}</div>
                          <div className="text-[11px] opacity-85 leading-relaxed">
                            {al.description}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-1 opacity-70" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Movimenti e Ultimi Eventi */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#566663]">
              Ultimi eventi registrati ({activity.length})
            </h3>

            {activity.length === 0 ? (
              <div className="p-4 bg-white border border-[#DCE4E2] rounded-xl text-xs text-[#566663]">
                Nessun movimento recente disponibile.
              </div>
            ) : (
              <div className="bg-white border border-[#DCE4E2] rounded-xl divide-y divide-[#EEF2F1] overflow-hidden">
                {activity.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="p-3 flex items-start justify-between gap-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#131C1B] truncate">{ev.title}</div>
                      <div className="text-[11px] text-[#566663] truncate">{ev.subtitle}</div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {ev.amountOrCount && (
                        <div className="font-mono tabular-nums font-bold text-[#074E44] text-[11px]">
                          {ev.amountOrCount}
                        </div>
                      )}
                      <div className="text-[10px] text-[#7A8C88] font-mono tabular-nums flex items-center justify-end gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {new Date(ev.timestamp).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
