import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Search,
  RefreshCw,
  User,
  Phone,
  MapPin,
  Globe,
  Filter,
  Download,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import {
  fetchSellerPurchaseRequests,
  fetchSellerOrders,
  confirmPurchaseRequest,
  rejectPurchaseRequest,
  updateOrderFulfillment,
  type EnrichedPurchaseRequest,
  type EnrichedOrder,
} from '../../services/ordersService';
import { fetchLocalEbayOrders } from '../../services/ebayService';
import type { EbayOrder, EbayOrderLineItem } from '../../types/ebay';
import { downloadCsvFile } from '../../utils/csvExport';
import {
  uiClasses,
  Button,
  KpiCard,
  SectionHeader,
  StatusBadge,
  AlertBanner,
  LoadingState,
  EmptyState,
  type BadgeTone,
} from '../ui/DesignSystem';

type OrderTab = 'all' | 'requests' | 'orders' | 'ebay';

export const OrdersManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const { refreshSnapshot } = useDashboard();
  const currentSeller = effectiveSellerProfile || sellerProfile;
  const sellerId = currentSeller?.id;

  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [requests, setRequests] = useState<EnrichedPurchaseRequest[]>([]);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [ebayOrders, setEbayOrders] = useState<EbayOrder[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [confirmingReq, setConfirmingReq] = useState<EnrichedPurchaseRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<EnrichedPurchaseRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Pezzo non più disponibile a magazzino');
  const [rejectNote, setRejectNote] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const [fulfillingOrder, setFulfillingOrder] = useState<EnrichedOrder | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('BRT Corriere Espresso');

  const loadData = useCallback(async () => {
    if (!sellerId) return;
    setIsLoading(true);
    setActionError(null);

    try {
      const [reqsRes, ordersRes, ebayRes] = await Promise.all([
        fetchSellerPurchaseRequests(sellerId),
        fetchSellerOrders(sellerId),
        fetchLocalEbayOrders(),
      ]);

      if (reqsRes.error) {
        console.warn('Errore lettura richieste acquisto:', reqsRes.error);
      } else {
        setRequests(reqsRes.data);
      }

      if (ordersRes.error) {
        console.warn('Errore lettura ordini:', ordersRes.error);
      } else {
        setOrders(ordersRes.data);
      }

      if (ebayRes.data) {
        setEbayOrders(ebayRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento degli ordini';
      setActionError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmRequest = async () => {
    if (!sellerId || !confirmingReq || !confirmingReq.inventory_id) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);

    const res = await confirmPurchaseRequest(sellerId, confirmingReq.id, confirmingReq.inventory_id);
    setIsSubmittingAction(false);

    if (res.success) {
      setActionNotice(
        `Richiesta #${confirmingReq.id.slice(0, 8)} confermata con successo. Il ricambio è ora riservato.`
      );
      setConfirmingReq(null);
      loadData();
      refreshSnapshot();
    } else {
      setActionError(res.error || 'Impossibile confermare la richiesta.');
    }
  };

  const handleRejectRequest = async () => {
    if (!sellerId || !rejectingReq) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);

    const res = await rejectPurchaseRequest(sellerId, rejectingReq.id, rejectReason, rejectNote);
    setIsSubmittingAction(false);

    if (res.success) {
      setActionNotice(`Richiesta #${rejectingReq.id.slice(0, 8)} rifiutata.`);
      setRejectingReq(null);
      loadData();
      refreshSnapshot();
    } else {
      setActionError(res.error || 'Impossibile rifiutare la richiesta.');
    }
  };

  const handleFulfillOrder = async () => {
    if (!sellerId || !fulfillingOrder) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);

    const res = await updateOrderFulfillment(
      sellerId,
      fulfillingOrder.id,
      'shipped',
      trackingNumber.trim() || undefined,
      carrier
    );
    setIsSubmittingAction(false);

    if (res.success) {
      setActionNotice(
        `Ordine #${fulfillingOrder.order_number || fulfillingOrder.id.slice(0, 8)} contrassegnato come Spedito.`
      );
      setFulfillingOrder(null);
      setTrackingNumber('');
      loadData();
      refreshSnapshot();
    } else {
      setActionError(res.error || 'Impossibile aggiornare la spedizione.');
    }
  };

  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === 'pending_seller_confirmation').length,
    [requests]
  );

  const paidOrdersToShipCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.payment_status === 'paid' &&
          o.fulfillment_status !== 'shipped' &&
          o.fulfillment_status !== 'delivered' &&
          o.fulfillment_status !== 'completed'
      ).length,
    [orders]
  );

  const ebayOrdersToShipCount = useMemo(
    () => ebayOrders.filter((o) => o.order_status !== 'SHIPPED').length,
    [ebayOrders]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const title = r.inventory?.title?.toLowerCase() || '';
      const oem = r.inventory?.oem_code?.toLowerCase() || '';
      const buyer = r.buyer_profile?.full_name?.toLowerCase() || '';
      const phone = r.buyer_profile?.phone?.toLowerCase() || '';
      const id = r.id.toLowerCase();
      return (
        title.includes(term) ||
        oem.includes(term) ||
        buyer.includes(term) ||
        phone.includes(term) ||
        id.includes(term)
      );
    });
  }, [requests, statusFilter, search]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const title = o.inventory?.title?.toLowerCase() || '';
      const num = o.order_number?.toLowerCase() || '';
      const buyer = o.buyer_profile?.full_name?.toLowerCase() || '';
      const id = o.id.toLowerCase();
      return title.includes(term) || num.includes(term) || buyer.includes(term) || id.includes(term);
    });
  }, [orders, statusFilter, search]);

  const filteredEbayOrders = useMemo(() => {
    return ebayOrders.filter((eo) => {
      if (statusFilter === 'shipped' && eo.order_status !== 'SHIPPED') return false;
      if (statusFilter === 'paid' && eo.order_status === 'SHIPPED') return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        eo.ebay_order_id.toLowerCase().includes(term) ||
        eo.buyer_username.toLowerCase().includes(term) ||
        (eo.line_items || []).some((li: EbayOrderLineItem) => li.title.toLowerCase().includes(term))
      );
    });
  }, [ebayOrders, statusFilter, search]);

  const totalAllCount = requests.length + orders.length + ebayOrders.length;

  const handleExportCsv = () => {
    const rows: Array<Array<string | number | null | undefined>> = [];

    if (activeTab === 'all' || activeTab === 'requests') {
      filteredRequests.forEach((r) => {
        rows.push([
          'Richiesta Shop',
          r.id.slice(0, 8),
          new Date(r.created_at).toLocaleString('it-IT'),
          r.inventory?.title || 'Ricambio',
          r.inventory?.oem_code || '',
          r.quantity,
          Number(r.price_at_request).toFixed(2),
          r.buyer_profile?.full_name || 'Cliente',
          r.delivery_method === 'pickup' ? 'Ritiro al banco' : 'Spedizione',
          r.status,
          '',
        ]);
      });
    }

    if (activeTab === 'all' || activeTab === 'orders') {
      filteredOrders.forEach((o) => {
        rows.push([
          'Ordine Shop',
          o.order_number || o.id.slice(0, 8),
          new Date(o.created_at).toLocaleString('it-IT'),
          o.inventory?.title || 'Ricambio',
          o.inventory?.oem_code || '',
          o.quantity,
          Number(o.total).toFixed(2),
          o.buyer_profile?.full_name || 'Cliente',
          o.delivery_method === 'pickup' ? 'Ritiro al banco' : o.shipping_address || 'Corriere',
          o.fulfillment_status || o.status,
          o.tracking_number || '',
        ]);
      });
    }

    if (activeTab === 'all' || activeTab === 'ebay') {
      filteredEbayOrders.forEach((eo) => {
        rows.push([
          'Ordine eBay',
          eo.ebay_order_id,
          new Date(eo.creation_date).toLocaleString('it-IT'),
          (eo.line_items || []).map((li) => li.title).join(' + ') || 'Articoli eBay',
          '',
          (eo.line_items || []).reduce((acc, li) => acc + (li.quantity || 1), 0),
          Number(eo.total_price).toFixed(2),
          eo.buyer_name || eo.buyer_username,
          eo.shipping_address
            ? `${eo.shipping_address.addressLine1 || ''}, ${eo.shipping_address.city || ''}`
            : 'eBay',
          eo.order_status,
          eo.tracking_number || '',
        ]);
      });
    }

    if (rows.length === 0) return;

    downloadCsvFile(
      `autopia-ordini-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Tipo',
        'Riferimento',
        'Data',
        'Articolo',
        'OEM',
        'Quantità',
        'Importo (€)',
        'Cliente',
        'Consegna',
        'Stato',
        'Tracking',
      ],
      rows
    );
    setActionNotice(`Esportate ${rows.length} transazioni in formato CSV.`);
  };

  const getRequestBadge = (status: string): { label: string; tone: BadgeTone } => {
    switch (status) {
      case 'pending_seller_confirmation':
        return { label: 'In attesa conferma', tone: 'warning' };
      case 'confirmed':
        return { label: 'Confermata (Riservata)', tone: 'success' };
      case 'paid':
        return { label: 'Pagata', tone: 'success' };
      case 'rejected':
        return { label: 'Rifiutata', tone: 'danger' };
      case 'expired':
        return { label: 'Scaduta', tone: 'neutral' };
      case 'cancelled':
        return { label: 'Annullata', tone: 'danger' };
      default:
        return { label: status, tone: 'neutral' };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#EEF2F3] font-sans text-[#131C1B]">
      {/* Header & KPI */}
      <div className="px-6 py-5 bg-white border-b border-[#DCE4E2] space-y-4 shrink-0">
        <SectionHeader
          icon={<ShoppingBag className="w-5 h-5" />}
          title="Ordini, Richieste & Spedizioni"
          description={`Monitora le richieste di acquisto e gestisci le evasioni di ${
            currentSeller?.business_name || 'Autodemolizione'
          } su Autopia Shop ed eBay.`}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                disabled={isLoading || totalAllCount === 0}
                title="Esporta transazioni filtrate in CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Esporta CSV</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#074E44]' : ''}`} />
                <span>Aggiorna</span>
              </Button>
            </>
          }
        />

        {actionNotice && (
          <AlertBanner tone="success" onDismiss={() => setActionNotice(null)}>
            {actionNotice}
          </AlertBanner>
        )}
        {actionError && (
          <AlertBanner tone="danger" onDismiss={() => setActionError(null)}>
            {actionError}
          </AlertBanner>
        )}

        {/* Schede KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Richieste da confermare"
            value={pendingRequestsCount}
            icon={<Clock className="w-4 h-4" />}
            accent={pendingRequestsCount > 0 ? 'warning' : 'default'}
            onClick={() => setActiveTab('requests')}
          />
          <KpiCard
            label="Ordini Shop da spedire"
            value={paidOrdersToShipCount}
            icon={<ShoppingBag className="w-4 h-4" />}
            accent="brand"
            onClick={() => setActiveTab('orders')}
          />
          <KpiCard
            label="Ordini eBay da spedire"
            value={ebayOrdersToShipCount}
            icon={<Globe className="w-4 h-4" />}
            accent="cyan"
            onClick={() => setActiveTab('ebay')}
          />
          <KpiCard
            label="Totale transazioni"
            value={totalAllCount}
            icon={<CheckCircle2 className="w-4 h-4" />}
            accent="success"
            onClick={() => setActiveTab('all')}
          />
        </div>

        {/* Segment Tab Bar + Filtri */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#E9EFEE] border border-[#DCE4E2]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-[#121B1A] text-white shadow-xs'
                  : 'text-[#566663] hover:text-[#131C1B]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Tutti</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">({totalAllCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-[#121B1A] text-white shadow-xs'
                  : 'text-[#566663] hover:text-[#131C1B]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Richieste Shop</span>
              {pendingRequestsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/90 text-[#121B1A] font-bold font-mono tabular-nums">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-[#121B1A] text-white shadow-xs'
                  : 'text-[#566663] hover:text-[#131C1B]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ordini Shop</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ebay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ebay'
                  ? 'bg-[#121B1A] text-white shadow-xs'
                  : 'text-[#566663] hover:text-[#131C1B]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Ordini eBay</span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">
                ({ebayOrders.length})
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 lg:max-w-xl">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#7C8E8A]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca ricambio, OEM, cliente, ID..."
                className={`${uiClasses.input} pl-8`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={uiClasses.select}
            >
              <option value="all">Tutti gli stati</option>
              <option value="pending_seller_confirmation">In attesa conferma</option>
              <option value="confirmed">Confermate / Riservate</option>
              <option value="paid">Pagate / Da Spedire</option>
              <option value="shipped">Spedite</option>
              <option value="completed">Completate / Consegnate</option>
              <option value="rejected">Rifiutate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenuto Principale */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <LoadingState message="Caricamento ordini e richieste dal database in corso..." />
        ) : totalAllCount === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-6 h-6" />}
            title="Nessun ordine o richiesta ricevuta"
            description="Quando un cliente effettua un acquisto su Autopia Shop o su eBay, i dettagli del ricambio, dell'acquirente e l'indirizzo di consegna compariranno qui."
          />
        ) : (
          <>
            {/* 1. RICHIESTE DI ACQUISTO */}
            {(activeTab === 'all' || activeTab === 'requests') && filteredRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#074E44] flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Richieste di Acquisto Autopia Shop ({filteredRequests.length})</span>
                  </h2>
                  <span className="text-[11px] text-[#566663]">
                    Verifica la disponibilità del ricambio per confermare la vendita
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredRequests.map((req) => {
                    const isPending = req.status === 'pending_seller_confirmation';
                    const badge = getRequestBadge(req.status);

                    return (
                      <div key={req.id} className={`${uiClasses.card} p-4 space-y-3`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-[#EEF2F1]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#074E44] tabular-nums">
                              Richiesta #{req.id.slice(0, 8)}
                            </span>
                            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                            <span className="text-[11px] text-[#566663]">
                              Modalità:{' '}
                              <strong className="text-[#131C1B]">
                                {req.delivery_method === 'pickup'
                                  ? 'Ritiro al banco'
                                  : 'Spedizione corriere'}
                              </strong>
                            </span>
                          </div>

                          <div className="text-xs text-[#566663] flex items-center gap-3 tabular-nums">
                            <span>
                              Data:{' '}
                              <strong className="text-[#131C1B]">
                                {new Date(req.created_at).toLocaleString('it-IT')}
                              </strong>
                            </span>
                            <span className="text-[#074E44] font-mono font-bold text-sm">
                              € {Number(req.price_at_request).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-[#F6F8F8] p-3 rounded-lg border border-[#E1E8E6] space-y-1">
                            <div className="text-xs font-bold text-[#131C1B] flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-[#074E44]" />
                              <span>{req.inventory?.title || 'Ricambio non specificato'}</span>
                            </div>
                            <div className="text-[#566663] space-y-0.5 text-[11px]">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {req.inventory?.oem_code && (
                                  <span>
                                    OEM{' '}
                                    <strong className="text-[#131C1B] font-mono">
                                      {req.inventory.oem_code}
                                    </strong>
                                  </span>
                                )}
                                {req.inventory?.position_note && (
                                  <>
                                    {req.inventory?.oem_code && <span aria-hidden="true">·</span>}
                                    <span>
                                      Scaffale{' '}
                                      <strong className="text-[#074E44]">
                                        {req.inventory.position_note}
                                      </strong>
                                    </span>
                                  </>
                                )}
                              </div>
                              {req.inventory?.seller_vehicles && (
                                <div>
                                  Veicolo: {req.inventory.seller_vehicles.make}{' '}
                                  {req.inventory.seller_vehicles.model}{' '}
                                  {req.inventory.seller_vehicles.version || ''}{' '}
                                  {req.inventory.seller_vehicles.plate
                                    ? `(Targa: ${req.inventory.seller_vehicles.plate})`
                                    : ''}
                                </div>
                              )}
                              <div className="tabular-nums">
                                Quantità richiesta:{' '}
                                <strong className="text-[#131C1B] font-mono">{req.quantity} pz</strong>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#F6F8F8] p-3 rounded-lg border border-[#E1E8E6] space-y-1">
                            <div className="text-xs font-bold text-[#131C1B] flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#074E44]" />
                              <span>Acquirente Autopia Shop</span>
                            </div>
                            <div className="text-[#566663] space-y-0.5 text-[11px]">
                              <div>
                                Nome:{' '}
                                <strong className="text-[#131C1B]">
                                  {req.buyer_profile?.full_name || 'Cliente Autopia'}
                                </strong>
                              </div>
                              {req.buyer_profile?.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#7C8E8A]" />
                                  <span className="font-mono text-[#131C1B]">
                                    {req.buyer_profile.phone}
                                  </span>
                                </div>
                              )}
                              {req.buyer_profile?.city && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#7C8E8A]" />
                                  <span>{req.buyer_profile.city}</span>
                                </div>
                              )}
                              {req.buyer_note && (
                                <div className="mt-1 p-2 bg-white rounded-md border border-[#DCE4E2] text-[#2E3C3A] italic">
                                  &ldquo;{req.buyer_note}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {isPending && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEF2F1]">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => setRejectingReq(req)}
                              className="text-red-700 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rifiuta Richiesta</span>
                            </Button>
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => setConfirmingReq(req)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Conferma e Riserva Pezzo</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. ORDINI AUTOPIA SHOP */}
            {(activeTab === 'all' || activeTab === 'orders') && filteredOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#074E44] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Ordini Conclusi &amp; Spedizioni Autopia Shop ({filteredOrders.length})</span>
                  </h2>
                  <span className="text-[11px] text-[#566663]">
                    Ordini pagati online con pagamento protetto
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredOrders.map((ord) => {
                    const isShipped =
                      ord.fulfillment_status === 'shipped' ||
                      ord.fulfillment_status === 'delivered' ||
                      ord.fulfillment_status === 'completed';

                    return (
                      <div key={ord.id} className={`${uiClasses.card} p-4 space-y-3`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-[#EEF2F1]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#074E44] tabular-nums">
                              Ordine #{ord.order_number || ord.id.slice(0, 8)}
                            </span>
                            <StatusBadge tone={isShipped ? 'brand' : 'success'}>
                              {isShipped ? 'Spedito / Consegnato' : 'Pagato · Da Spedire'}
                            </StatusBadge>
                            <span className="text-[11px] text-[#566663]">
                              Canale{' '}
                              <strong className="text-[#131C1B] capitalize">
                                {ord.sale_channel || 'Autopia Shop'}
                              </strong>
                            </span>
                          </div>

                          <div className="text-xs text-[#566663] flex items-center gap-3 tabular-nums">
                            <span>
                              Data:{' '}
                              <strong className="text-[#131C1B]">
                                {new Date(ord.created_at).toLocaleString('it-IT')}
                              </strong>
                            </span>
                            <span className="text-[#074E44] font-mono font-bold text-sm">
                              Totale: € {Number(ord.total).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-[#F6F8F8] p-3 rounded-lg border border-[#E1E8E6] space-y-1">
                            <div className="text-xs font-bold text-[#131C1B] flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-[#074E44]" />
                              <span>{ord.inventory?.title || 'Ricambio non specificato'}</span>
                            </div>
                            <div className="text-[#566663] space-y-0.5 text-[11px]">
                              {(ord.inventory?.oem_code || ord.inventory?.position_note) && (
                                <div className="flex flex-wrap items-center gap-x-2">
                                  {ord.inventory?.oem_code && (
                                    <span>
                                      OEM{' '}
                                      <strong className="text-[#131C1B] font-mono">
                                        {ord.inventory.oem_code}
                                      </strong>
                                    </span>
                                  )}
                                  {ord.inventory?.position_note && (
                                    <>
                                      {ord.inventory?.oem_code && <span aria-hidden="true">·</span>}
                                      <span>
                                        Scaffale{' '}
                                        <strong className="text-[#074E44]">
                                          {ord.inventory.position_note}
                                        </strong>
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                              <div className="tabular-nums">
                                Quantità: <strong className="text-[#131C1B] font-mono">{ord.quantity} pz</strong>{' '}
                                <span aria-hidden="true">·</span> Netto venditore:{' '}
                                <strong className="text-emerald-700 font-mono">
                                  € {Number(ord.seller_amount).toFixed(2)}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#F6F8F8] p-3 rounded-lg border border-[#E1E8E6] space-y-1">
                            <div className="text-xs font-bold text-[#131C1B] flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#074E44]" />
                              <span>Indirizzo di Consegna / Ritiro</span>
                            </div>
                            <div className="text-[#566663] space-y-0.5 text-[11px]">
                              <div>
                                Destinatario:{' '}
                                <strong className="text-[#131C1B]">
                                  {ord.buyer_profile?.full_name || 'Cliente'}
                                </strong>
                              </div>
                              {ord.shipping_address ? (
                                <div>
                                  Indirizzo:{' '}
                                  <span className="text-[#131C1B] font-medium">
                                    {ord.shipping_address}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  Metodo:{' '}
                                  <strong className="text-[#074E44]">
                                    {ord.delivery_method === 'pickup'
                                      ? 'Ritiro diretto al banco'
                                      : 'Spedizione standard'}
                                  </strong>
                                </div>
                              )}
                              {ord.tracking_number && (
                                <div className="mt-1 p-1.5 bg-white rounded-md font-mono text-[11px] text-[#074E44] border border-[#C6DFDA]">
                                  Tracking ({ord.carrier || 'Corriere'}): {ord.tracking_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isShipped && ord.delivery_method !== 'pickup' && (
                          <div className="flex items-center justify-end pt-2 border-t border-[#EEF2F1]">
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => setFulfillingOrder(ord)}
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Inserisci Tracking e Spedisci</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ORDINI EBAY */}
            {(activeTab === 'all' || activeTab === 'ebay') && filteredEbayOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#074E44] flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    <span>Ordini Sincronizzati da eBay ({filteredEbayOrders.length})</span>
                  </h2>
                  <span className="text-[11px] text-[#566663]">Canale eBay Sandbox</span>
                </div>

                <div className="space-y-3">
                  {filteredEbayOrders.map((eo) => (
                    <div key={eo.id} className={`${uiClasses.card} p-4 space-y-3`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-[#EEF2F1]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#074E44]">
                            eBay #{eo.ebay_order_id}
                          </span>
                          <StatusBadge tone={eo.order_status === 'SHIPPED' ? 'brand' : 'success'}>
                            {eo.order_status === 'SHIPPED' ? 'Spedito' : 'Pagato · Da Spedire'}
                          </StatusBadge>
                        </div>

                        <div className="text-xs text-[#566663] flex items-center gap-3 tabular-nums">
                          <span>
                            Data:{' '}
                            <strong className="text-[#131C1B]">
                              {new Date(eo.creation_date).toLocaleDateString('it-IT')}
                            </strong>
                          </span>
                          <span className="text-[#074E44] font-mono font-bold text-sm">
                            € {eo.total_price.toFixed(2)} {eo.currency}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#F6F8F8] p-3 rounded-lg border border-[#E1E8E6] space-y-1">
                          <div className="text-xs font-bold text-[#131C1B]">
                            Articoli Venduti su eBay
                          </div>
                          {(eo.line_items || []).map((li: EbayOrderLineItem, idx: number) => (
                            <div key={idx} className="text-[#3F4E4B] text-[11px] tabular-nums">
                              · <strong className="text-[#131C1B]">{li.title}</strong> (Qtà:{' '}
                              {li.quantity}) {li.lineItemCost ? `- € ${li.lineItemCost}` : ''}
                            </div>
                          ))}
                        </div>

                        <div className="bg-[#F6F8F8] p-3 rounded-lg border border-[#E1E8E6] space-y-1">
                          <div className="text-xs font-bold text-[#131C1B]">Destinatario eBay</div>
                          <div className="text-[#566663] text-[11px]">
                            <div>
                              Utente: <strong className="text-[#131C1B]">@{eo.buyer_username}</strong>{' '}
                              {eo.buyer_name ? `(${eo.buyer_name})` : ''}
                            </div>
                            {eo.shipping_address && (
                              <div className="truncate">
                                Indirizzo: {eo.shipping_address.addressLine1 || ''},{' '}
                                {eo.shipping_address.city || ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nessun risultato coi filtri attuali */}
            {(activeTab === 'requests' && filteredRequests.length === 0) ||
            (activeTab === 'orders' && filteredOrders.length === 0) ||
            (activeTab === 'ebay' && filteredEbayOrders.length === 0) ||
            (activeTab === 'all' &&
              filteredRequests.length === 0 &&
              filteredOrders.length === 0 &&
              filteredEbayOrders.length === 0) ? (
              <EmptyState
                icon={<Search className="w-6 h-6" />}
                title="Nessuna transazione corrisponde ai filtri"
                description="Prova a modificare i criteri di ricerca o lo stato selezionato."
              />
            ) : null}
          </>
        )}
      </div>

      {/* MODAL CONFERMA RICHIESTA */}
      {confirmingReq && (
        <div className="fixed inset-0 z-50 bg-[#0F1615]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE4E2] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#121B1A] text-white flex items-center justify-between border-b border-[#253331]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#5EEAD4]" />
                <h3 className="text-sm font-bold">Conferma Richiesta di Acquisto</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingReq(null)}
                className="p-1 text-[#95A7A3] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#3F4E4B] leading-relaxed">
                Stai confermando la disponibilità del ricambio{' '}
                <strong className="text-[#131C1B]">&ldquo;{confirmingReq.inventory?.title}&rdquo;</strong> per il cliente.
                Lo stato del ricambio a magazzino verrà impostato su{' '}
                <strong className="text-[#074E44]">RISERVATO</strong> per evitare vendite duplicate.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEF2F1]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingReq(null)}
                  disabled={isSubmittingAction}
                >
                  Annulla
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmRequest}
                  loading={isSubmittingAction}
                >
                  Conferma e Riserva
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIFIUTO RICHIESTA */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-[#0F1615]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE4E2] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#121B1A] text-white flex items-center justify-between border-b border-[#253331]">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-4.5 h-4.5 text-red-400" />
                <h3 className="text-sm font-bold">Rifiuta Richiesta di Acquisto</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="p-1 text-[#95A7A3] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#3F4E4B]">
                Indica il motivo per cui non puoi evadere la richiesta per{' '}
                <strong className="text-[#131C1B]">&ldquo;{rejectingReq.inventory?.title}&rdquo;</strong>:
              </p>
              <div className="space-y-3">
                <div>
                  <label className={uiClasses.label}>Motivo</label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className={uiClasses.select}
                  >
                    <option value="Pezzo non più disponibile a magazzino">
                      Pezzo non più disponibile a magazzino
                    </option>
                    <option value="Danneggiato durante lo smontaggio">
                      Danneggiato durante lo smontaggio
                    </option>
                    <option value="Incompatibile con il modello richiesto">
                      Incompatibile con il modello richiesto
                    </option>
                    <option value="Altro">Altro motivo</option>
                  </select>
                </div>
                <div>
                  <label className={uiClasses.label}>Nota aggiuntiva (opzionale)</label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Nota per il cliente..."
                    rows={2}
                    className={uiClasses.textarea}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEF2F1]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRejectingReq(null)}
                  disabled={isSubmittingAction}
                >
                  Annulla
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRejectRequest}
                  loading={isSubmittingAction}
                >
                  Conferma Rifiuto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPEDIZIONE ORDINE */}
      {fulfillingOrder && (
        <div className="fixed inset-0 z-50 bg-[#0F1615]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE4E2] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#121B1A] text-white flex items-center justify-between border-b border-[#253331]">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4.5 h-4.5 text-[#5EEAD4]" />
                <h3 className="text-sm font-bold">Registra Spedizione Ordine</h3>
              </div>
              <button
                type="button"
                onClick={() => setFulfillingOrder(null)}
                className="p-1 text-[#95A7A3] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#3F4E4B]">
                Inserisci i dettagli di spedizione per l&apos;ordine #
                <span className="font-mono font-semibold text-[#131C1B]">
                  {fulfillingOrder.order_number || fulfillingOrder.id.slice(0, 8)}
                </span>
                :
              </p>
              <div className="space-y-3">
                <div>
                  <label className={uiClasses.label}>Corriere</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className={uiClasses.select}
                  >
                    <option value="BRT Corriere Espresso">BRT Corriere Espresso</option>
                    <option value="GLS Italy">GLS Italy</option>
                    <option value="SDA Express Courier">SDA Express Courier</option>
                    <option value="DHL Express">DHL Express</option>
                    <option value="Poste Italiane">Poste Italiane</option>
                    <option value="Altro">Altro vettore</option>
                  </select>
                </div>
                <div>
                  <label className={uiClasses.label}>Codice di Tracking (Lettera di Vettura)</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Es. BRT123456789IT"
                    className={`${uiClasses.input} font-mono`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEF2F1]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFulfillingOrder(null)}
                  disabled={isSubmittingAction}
                >
                  Annulla
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleFulfillOrder}
                  loading={isSubmittingAction}
                >
                  Salva e Segna come Spedito
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
