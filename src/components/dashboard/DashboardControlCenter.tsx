import React from 'react';
import {
  Package,
  Car,
  ShoppingBag,
  Globe,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Store,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  FileText,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import type { DesktopSection } from '../desktop/DesktopShell';
import {
  Button,
  KpiCard,
  StatusBadge,
  LoadingState,
  AlertBanner,
} from '../ui/DesignSystem';

interface DashboardControlCenterProps {
  onSelectSection: (section: DesktopSection) => void;
}

export const DashboardControlCenter: React.FC<DashboardControlCenterProps> = ({
  onSelectSection,
}) => {
  const { user, sellerProfile, effectiveSellerProfile, isAdmin } = useAuth();
  const { snapshot, isLoading, error, refreshSnapshot } = useDashboard();
  const activeSeller = effectiveSellerProfile || sellerProfile;

  if (!activeSeller) return null;

  if (isLoading && !snapshot) {
    return (
      <div className="p-6 max-w-7xl mx-auto w-full">
        <LoadingState message="Elaborazione indicatori reali da magazzino, parco auto e ordini..." />
      </div>
    );
  }

  const kpis = snapshot?.kpis;
  const monthlySeries = snapshot?.monthlySeries || [];
  const maxBarCount = Math.max(
    1,
    ...monthlySeries.map((m) => Math.max(m.partsAdded, m.vehiclesAdded + m.ordersCount))
  );
  const categoryDistribution = snapshot?.categoryDistribution || [];
  const availability = snapshot?.availabilityBreakdown || [];
  const totalAvail = Math.max(
    1,
    availability.reduce((acc, item) => acc + item.count, 0)
  );
  const alerts = snapshot?.alerts || [];
  const recentActivity = snapshot?.recentActivity || [];
  const adminOverview = snapshot?.adminOverview;

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-5 font-sans">
      {error && (
        <AlertBanner
          tone="warning"
          title="Aggiornamento parziale dei dati"
          action={
            <Button variant="secondary" size="xs" onClick={refreshSnapshot}>
              Riprova
            </Button>
          }
        >
          {error}
        </AlertBanner>
      )}

      {/* BANNER IDENTITÀ OPERATIVA & AZIONI RAPIDE */}
      <div className="bg-[#131C1B] text-[#F1F6F5] border border-[#253331] rounded-2xl p-5 shadow-[0_8px_24px_-12px_rgba(15,28,26,0.35)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0A6256]/60 border border-[#198575]/60 text-[#5EEAD4] text-[11px] font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isAdmin ? 'Console Amministratore' : 'Centro Autodemolizione Verificato'}</span>
            </span>
            <span className="text-[11px] text-[#8DA39E] font-mono tabular-nums">
              {kpis?.ebayConnected
                ? `eBay collegato${kpis.ebayUsername ? ` (${kpis.ebayUsername})` : ''}`
                : 'Canale eBay non collegato'}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white truncate">
            {activeSeller.business_name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A3B7B2]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>
                {activeSeller.city}
                {activeSeller.province ? ` (${activeSeller.province})` : ''}
              </span>
            </span>
            {activeSeller.vat_number && (
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <FileText className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>P.IVA {activeSeller.vat_number}</span>
              </span>
            )}
            {user?.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>{user.email}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="dark" size="sm" onClick={() => onSelectSection('vehicles')}>
            <Car className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Parco Veicoli</span>
          </Button>
          <Button variant="dark" size="sm" onClick={() => onSelectSection('import')}>
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span>Importa CSV</span>
          </Button>
          <Button variant="success" size="sm" onClick={() => onSelectSection('parts')}>
            <Package className="w-3.5 h-3.5" />
            <span>Apri Magazzino</span>
          </Button>
        </div>
      </div>

      {/* STRIP KPI REALI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Magazzino Ricambi"
          value={kpis ? kpis.totalPartRecords.toLocaleString('it-IT') : '—'}
          icon={<Package className="w-4 h-4" />}
          accent="brand"
          hint={
            kpis
              ? `${kpis.totalStockUnits.toLocaleString('it-IT')} pz fisici · Valore € ${Math.round(
                  kpis.warehouseEstimatedValue
                ).toLocaleString('it-IT')}`
              : undefined
          }
          onClick={() => onSelectSection('parts')}
        />
        <KpiCard
          label="Online su Autopia Shop"
          value={kpis ? kpis.onlineParts.toLocaleString('it-IT') : '—'}
          icon={<Store className="w-4 h-4" />}
          accent="success"
          hint={
            kpis
              ? `${kpis.draftIncompleteParts} bozze senza prezzo · ${kpis.totalSoldUnits} pz venduti`
              : undefined
          }
          onClick={() => onSelectSection('listings')}
        />
        <KpiCard
          label="Veicoli in Piazzale"
          value={kpis ? kpis.totalVehicles.toLocaleString('it-IT') : '—'}
          icon={<Car className="w-4 h-4" />}
          accent="cyan"
          hint={
            kpis
              ? `${kpis.activeDismantlingVehicles} in lavorazione / smontaggio`
              : undefined
          }
          onClick={() => onSelectSection('vehicles')}
        />
        <KpiCard
          label="Ordini & Richieste"
          value={kpis ? kpis.totalOrdersCount.toLocaleString('it-IT') : '—'}
          icon={<ShoppingBag className="w-4 h-4" />}
          accent={
            kpis && kpis.pendingPurchaseRequests + kpis.paidOrdersToShip > 0
              ? 'warning'
              : 'default'
          }
          hint={
            kpis
              ? `${kpis.pendingPurchaseRequests} da confermare · ${kpis.paidOrdersToShip} da spedire · € ${kpis.grossSalesRevenue.toFixed(
                  2
                )}`
              : undefined
          }
          onClick={() => onSelectSection('orders')}
        />
      </div>

      {/* RIGHE ANALITICHE & GRAFICI SVG REALI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRAFICO ANDAMENTO MENSILE REALE (2/3) */}
        <div className="lg:col-span-2 bg-white border border-[#DCE4E2] rounded-xl p-5 shadow-[0_1px_2px_rgba(15,28,26,0.04)] flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#131C1B] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#074E44]" />
                <span>Attività Operativa (Ultimi 6 Mesi)</span>
              </h2>
              <p className="text-[11px] text-[#566663]">
                Volumi reali registrati: ricambi caricati a catalogo, ingressi veicoli e ordini confermati
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#455451]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#074E44]" />
                <span>Ricambi</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0891B2]" />
                <span>Veicoli</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" />
                <span>Ordini</span>
              </span>
            </div>
          </div>

          {/* Grafico SVG a colonne raggruppate */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 600 185"
              className="w-full h-44 min-w-[440px]"
              role="img"
              aria-label="Grafico attività mensile"
            >
              {/* Linee griglia orizzontali */}
              {[0, 1, 2, 3].map((step) => {
                const y = 20 + step * 40;
                return (
                  <line
                    key={step}
                    x1="28"
                    x2="585"
                    y1={y}
                    y2={y}
                    stroke="#E7EEEC"
                    strokeDasharray={step < 3 ? '3 3' : undefined}
                    strokeWidth="1"
                  />
                );
              })}

              {monthlySeries.map((pt, idx) => {
                const groupWidth = 90;
                const baseX = 44 + idx * groupWidth;
                const chartHeight = 120;
                const baselineY = 140;

                const hParts = Math.max(
                  pt.partsAdded > 0 ? 4 : 0,
                  Math.round((pt.partsAdded / maxBarCount) * chartHeight)
                );
                const hVeh = Math.max(
                  pt.vehiclesAdded > 0 ? 4 : 0,
                  Math.round((pt.vehiclesAdded / maxBarCount) * chartHeight)
                );
                const hOrd = Math.max(
                  pt.ordersCount > 0 ? 4 : 0,
                  Math.round((pt.ordersCount / maxBarCount) * chartHeight)
                );

                return (
                  <g key={pt.key}>
                    <rect
                      x={baseX}
                      y={baselineY - hParts}
                      width="16"
                      height={hParts}
                      rx="3"
                      fill="#074E44"
                    >
                      <title>{`${pt.label}: ${pt.partsAdded} ricambi caricati`}</title>
                    </rect>
                    <rect
                      x={baseX + 20}
                      y={baselineY - hVeh}
                      width="16"
                      height={hVeh}
                      rx="3"
                      fill="#0891B2"
                    >
                      <title>{`${pt.label}: ${pt.vehiclesAdded} veicoli registrati`}</title>
                    </rect>
                    <rect
                      x={baseX + 40}
                      y={baselineY - hOrd}
                      width="16"
                      height={hOrd}
                      rx="3"
                      fill="#D97706"
                    >
                      <title>{`${pt.label}: ${pt.ordersCount} ordini (€ ${pt.revenue.toFixed(2)})`}</title>
                    </rect>

                    {/* Valori numerici sopra il gruppo se > 0 */}
                    <text
                      x={baseX + 28}
                      y="170"
                      textAnchor="middle"
                      fill="#566663"
                      fontSize="11"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-2 border-t border-[#EEF2F1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#566663]">
            <span>
              Totale ricambi recenti analizzati:{' '}
              <strong className="font-mono text-[#131C1B] tabular-nums">
                {monthlySeries.reduce((a, b) => a + b.partsAdded, 0)}
              </strong>
            </span>
            <span>
              Fatturato ordini periodo:{' '}
              <strong className="font-mono text-[#074E44] tabular-nums">
                € {monthlySeries.reduce((a, b) => a + b.revenue, 0).toFixed(2)}
              </strong>
            </span>
          </div>
        </div>

        {/* SALUTE MAGAZZINO & DISTRIBUZIONE CATEGORIE (1/3) */}
        <div className="bg-white border border-[#DCE4E2] rounded-xl p-5 shadow-[0_1px_2px_rgba(15,28,26,0.04)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#131C1B] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#074E44]" />
              <span>Composizione Magazzino</span>
            </h2>

            {/* Barra segmentata stato disponibilità */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-[#EDF2F1] overflow-hidden flex">
                {availability.map((seg) => {
                  const pct = (seg.count / totalAvail) * 100;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={seg.label}
                      style={{ width: `${pct}%`, backgroundColor: seg.color }}
                      title={`${seg.label}: ${seg.count}`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {availability.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between gap-1 text-[#455451]">
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-xs shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="truncate">{seg.label}</span>
                    </span>
                    <span className="font-mono font-bold text-[#131C1B] tabular-nums">
                      {seg.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EEF2F1] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#566663]">
                Principali Categorie Ricambi
              </div>

              {categoryDistribution.length === 0 ? (
                <p className="text-xs text-[#667774]">
                  Nessun ricambio ancora associato alle categorie.
                </p>
              ) : (
                <div className="space-y-2">
                  {categoryDistribution.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#131C1B] truncate max-w-[175px]">
                          {cat.category}
                        </span>
                        <span className="font-mono text-[11px] text-[#566663] tabular-nums">
                          {cat.count} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#EDF2F1] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D9488] rounded-full"
                          style={{ width: `${Math.max(4, cat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            size="xs"
            onClick={() => onSelectSection('parts')}
            className="w-full"
          >
            <span>Esplora tutto il magazzino</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* SECONDA RIGA: AZIONI RICHIESTE + CANALI + ATTIVITÀ RECENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CODA AZIONI RICHIESTE (1/3) */}
        <div className="bg-white border border-[#DCE4E2] rounded-xl p-5 shadow-[0_1px_2px_rgba(15,28,26,0.04)] flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#131C1B] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Priorità Operative</span>
            </h2>
            <StatusBadge tone={alerts.length > 0 ? 'warning' : 'success'}>
              {alerts.length > 0 ? `${alerts.length} aperte` : 'Tutto regolare'}
            </StatusBadge>
          </div>

          {alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-2 text-xs text-[#566663]">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <p className="max-w-xs">
                Nessuna richiesta in sospeso, nessun ordine da evadere e prezzi coerenti.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => onSelectSection(al.targetSection)}
                  className="w-full text-left p-3 rounded-xl bg-[#F6F8F8] hover:bg-[#EAF3F1]/70 border border-[#DCE4E2] hover:border-[#074E44]/40 transition-colors flex items-start justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {al.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#131C1B] truncate">{al.title}</div>
                      <div className="text-[11px] text-[#566663] line-clamp-2 mt-0.5">
                        {al.description}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#074E44] shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ATTIVITÀ RECENTE REALE (1/3) */}
        <div className="bg-white border border-[#DCE4E2] rounded-xl p-5 shadow-[0_1px_2px_rgba(15,28,26,0.04)] flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#131C1B] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#074E44]" />
              <span>Attività Recente</span>
            </h2>
            <button
              type="button"
              onClick={refreshSnapshot}
              className="text-[11px] font-semibold text-[#074E44] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Aggiorna</span>
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#667774]">
              Nessun evento recente registrato per questa sede.
            </div>
          ) : (
            <div className="divide-y divide-[#EEF2F1] max-h-72 overflow-y-auto pr-1">
              {recentActivity.slice(0, 7).map((item) => (
                <div key={item.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#131C1B] truncate">{item.title}</div>
                    <div className="text-[11px] text-[#566663] truncate">{item.subtitle}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {item.amountOrCount && (
                      <div className="font-mono font-bold text-[#074E44] tabular-nums text-[11px]">
                        {item.amountOrCount}
                      </div>
                    )}
                    <div className="font-mono text-[10px] text-[#7A8C88] tabular-nums">
                      {new Date(item.timestamp).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STATO CANALI & RETE ADMIN (1/3) */}
        <div className="space-y-4 flex flex-col">
          {/* Card Canale eBay & Vetrina */}
          <div className="bg-white border border-[#DCE4E2] rounded-xl p-5 shadow-[0_1px_2px_rgba(15,28,26,0.04)] space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#131C1B] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#074E44]" />
                <span>Canali Collegati</span>
              </h2>
              <StatusBadge tone={kpis?.ebayConnected ? 'success' : 'neutral'}>
                {kpis?.ebayConnected ? 'eBay Attivo' : 'Solo Shop'}
              </StatusBadge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#F6F8F8] border border-[#E1E8E6] rounded-lg flex items-center justify-between">
                <span className="text-[#455451]">Vetrina Autopia Shop</span>
                <span className="font-mono font-bold text-[#074E44] tabular-nums">
                  {kpis?.onlineParts || 0} annunci
                </span>
              </div>

              <div className="p-2.5 bg-[#F6F8F8] border border-[#E1E8E6] rounded-lg flex items-center justify-between">
                <span className="text-[#455451]">Inserzioni eBay Sandbox</span>
                <span className="font-mono font-bold text-[#131C1B] tabular-nums">
                  {kpis?.ebayPublishedListings || 0} attive
                </span>
              </div>

              <div className="p-2.5 bg-[#F6F8F8] border border-[#E1E8E6] rounded-lg flex items-center justify-between">
                <span className="text-[#455451]">Ordini eBay da evadere</span>
                <span className="font-mono font-bold text-[#131C1B] tabular-nums">
                  {kpis?.ebayOrdersToShip || 0}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="secondary" size="xs" onClick={() => onSelectSection('listings')}>
                Annunci Shop
              </Button>
              <Button variant="secondary" size="xs" onClick={() => onSelectSection('ebay')}>
                Gestisci eBay
              </Button>
            </div>
          </div>

          {/* Box Sintesi Piattaforma (Visibile solo ad Admin) */}
          {isAdmin && adminOverview && (
            <div className="bg-[#121B1A] text-white border border-[#253331] rounded-xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5EEAD4]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Rete Piattaforma (Admin)</span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-[#9BB0AB]">
                  {adminOverview.catalogVehiclesTotal.toLocaleString('it-IT')} modelli
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[#1A2725] border border-[#293B38]">
                  <div className="font-mono font-bold text-sm text-white tabular-nums">
                    {adminOverview.approvedSellers}
                  </div>
                  <div className="text-[10px] text-[#9BB0AB]">Attivi</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1A2725] border border-[#293B38]">
                  <div className="font-mono font-bold text-sm text-amber-300 tabular-nums">
                    {adminOverview.pendingSellers}
                  </div>
                  <div className="text-[10px] text-[#9BB0AB]">In attesa</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1A2725] border border-[#293B38]">
                  <div className="font-mono font-bold text-sm text-[#DCE6E3] tabular-nums">
                    {adminOverview.totalSellers}
                  </div>
                  <div className="text-[10px] text-[#9BB0AB]">Totali</div>
                </div>
              </div>

              <Button
                variant="dark"
                size="xs"
                className="w-full"
                onClick={() => onSelectSection('admin')}
              >
                <span>Apri Amministrazione Rete</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
