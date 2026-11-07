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
  AlertCircle,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  ExternalLink,
  ChevronRight,
  Hash,
  Send,
  Loader2,
  Globe,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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

type OrderTab = 'all' | 'requests' | 'orders' | 'ebay';

export const OrdersManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
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

  // Modal / Form di conferma e rifiuto
  const [confirmingReq, setConfirmingReq] = useState<EnrichedPurchaseRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<EnrichedPurchaseRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Pezzo non più disponibile a magazzino');
  const [rejectNote, setRejectNote] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Form di Spedizione per ordini Autopia Shop
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

  // Gestione conferma richiesta
  const handleConfirmRequest = async () => {
    if (!sellerId || !confirmingReq || !confirmingReq.inventory_id) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setActionNotice(null);

    const res = await confirmPurchaseRequest(sellerId, confirmingReq.id, confirmingReq.inventory_id);
    setIsSubmittingAction(false);

    if (res.success) {
      setActionNotice(`Richiesta #${confirmingReq.id.slice(0, 8)} confermata con successo! Il ricambio è stato riservato.`);
      setConfirmingReq(null);
      loadData();
    } else {
      setActionError(res.error || 'Impossibile confermare la richiesta.');
    }
  };

  // Gestione rifiuto richiesta
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
    } else {
      setActionError(res.error || 'Impossibile rifiutare la richiesta.');
    }
  };

  // Gestione spedizione ordine Autopia Shop
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
      setActionNotice(`Ordine #${fulfillingOrder.order_number || fulfillingOrder.id.slice(0, 8)} contrassegnato come Spedito!`);
      setFulfillingOrder(null);
      setTrackingNumber('');
      loadData();
    } else {
      setActionError(res.error || 'Impossibile aggiornare la spedizione.');
    }
  };

  // Statistiche conteggi
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'pending_seller_confirmation').length;
  }, [requests]);

  const paidOrdersToShipCount = useMemo(() => {
    return orders.filter(
      (o) => o.payment_status === 'paid' && o.fulfillment_status !== 'shipped' && o.fulfillment_status !== 'delivered' && o.fulfillment_status !== 'completed'
    ).length;
  }, [orders]);

  const ebayOrdersToShipCount = useMemo(() => {
    return ebayOrders.filter((o) => o.order_status !== 'SHIPPED').length;
  }, [ebayOrders]);

  // Filtro e ricerca elementi combinati
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
      return title.includes(term) || oem.includes(term) || buyer.includes(term) || phone.includes(term) || id.includes(term);
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-sans text-slate-100">
      {/* 1. Barra Superiore con Statistiche e Filtri */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Vendite & Ordini
              </span>
              <span className="text-xs text-slate-400">
                {currentSeller?.business_name || 'Autodemolitore'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span>Gestione Ordini e Richieste di Acquisto</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizza i ricambi venduti, le richieste ricevute dai clienti su Autopia Shop e gli ordini sincronizzati da eBay.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Aggiorna Dati</span>
            </button>
          </div>
        </div>

        {/* Notifiche ed Errori */}
        {actionNotice && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Schede KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-amber-400 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Richieste da Confermare</span>
            </div>
            <div className="text-xl font-bold text-slate-100 mt-1">
              {pendingRequestsCount}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center space-x-1">
              <ShoppingBag className="w-3 h-3" />
              <span>Ordini Shop da Spedire</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {paidOrdersToShipCount}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-blue-400 flex items-center space-x-1">
              <Globe className="w-3 h-3" />
              <span>Ordini eBay da Spedire</span>
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">
              {ebayOrdersToShipCount}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-slate-400" />
              <span>Totale Transazioni</span>
            </div>
            <div className="text-xl font-bold text-slate-100 mt-1">
              {requests.length + orders.length + ebayOrders.length}
            </div>
          </div>
        </div>

        {/* Tab di Navigazione Sezioni */}
        <div className="flex border-b border-slate-800 space-x-1 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-950 text-amber-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Tutti gli Ordini</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {requests.length + orders.length + ebayOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-slate-950 text-amber-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Richieste di Acquisto (Shop)</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-950 text-amber-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ordini Autopia Shop</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ebay')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'ebay'
                ? 'bg-slate-950 text-amber-400 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Ordini Canale eBay</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {ebayOrders.length}
            </span>
          </button>
        </div>

        {/* Barra di Ricerca e Filtro Stato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per ricambio, codice OEM, nome cliente, ID transazione..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutti gli stati</option>
              <option value="pending_seller_confirmation">In attesa di conferma demolitore</option>
              <option value="confirmed">Confermate / Riservate</option>
              <option value="paid">Pagate / Da Spedire</option>
              <option value="shipped">Spedite</option>
              <option value="completed">Completate / Consegnate</option>
              <option value="rejected">Rifiutate</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Contenuto Principale: Elenco Ordini e Richieste */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading && (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span>Caricamento ordini e richieste dal database in corso...</span>
          </div>
        )}

        {!isLoading && requests.length === 0 && orders.length === 0 && ebayOrders.length === 0 && (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
            <div className="text-sm font-bold text-slate-200">
              Nessun ordine o richiesta di acquisto ricevuta
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Quando un cliente effettua un acquisto su <strong>Autopia Shop</strong> o sul canale <strong>eBay</strong>, i dettagli del pezzo venduto, i dati dell'acquirente e l'indirizzo di consegna compariranno immediatamente qui.
            </p>
          </div>
        )}

        {/* 1. SEZIONE RICHIESTE DI ACQUISTO (Fase di approvazione) */}
        {(activeTab === 'all' || activeTab === 'requests') && filteredRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Clock className="w-4 h-4" />
                <span>Richieste di Acquisto da Autopia Shop ({filteredRequests.length})</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Verifica disponibilità ricambio per confermare la vendita
              </span>
            </div>

            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'pending_seller_confirmation';
                const isConfirmed = req.status === 'confirmed' || req.status === 'paid';
                const isRejected = req.status === 'rejected' || req.status === 'cancelled';

                return (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          Richiesta #{req.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : isConfirmed
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {req.status === 'pending_seller_confirmation' && 'In Attesa di Tua Conferma'}
                          {req.status === 'confirmed' && 'Confermata (Riservata)'}
                          {req.status === 'paid' && 'Pagata'}
                          {req.status === 'rejected' && 'Rifiutata'}
                          {req.status === 'expired' && 'Scaduta'}
                          {req.status === 'cancelled' && 'Annullata'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Modalità: <strong className="text-slate-200">{req.delivery_method === 'pickup' ? 'Ritiro al banco' : 'Spedizione corriere'}</strong>
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center space-x-3">
                        <span>Data: <strong className="text-slate-200">{new Date(req.created_at).toLocaleString('it-IT')}</strong></span>
                        <span className="text-amber-400 font-mono font-bold text-sm">
                          €{Number(req.price_at_request).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Dettagli Ricambio */}
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>{req.inventory?.title || 'Ricambio non specificato'}</span>
                        </div>
                        <div className="text-slate-400 space-y-0.5 text-[11px]">
                          {req.inventory?.oem_code && (
                            <div>Codice OEM: <strong className="text-slate-200 font-mono">{req.inventory.oem_code}</strong></div>
                          )}
                          {req.inventory?.position_note && (
                            <div>Scaffale/Ubicazione: <strong className="text-amber-300">{req.inventory.position_note}</strong></div>
                          )}
                          {req.inventory?.seller_vehicles && (
                            <div>
                              Veicolo: {req.inventory.seller_vehicles.make} {req.inventory.seller_vehicles.model} {req.inventory.seller_vehicles.version || ''} {req.inventory.seller_vehicles.plate ? `(Targa: ${req.inventory.seller_vehicles.plate})` : ''}
                            </div>
                          )}
                          <div>Quantità richiesta: <strong className="text-slate-200">{req.quantity} pezzo/i</strong></div>
                        </div>
                      </div>

                      {/* Dettagli Acquirente */}
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>Acquirente Autopia Shop</span>
                        </div>
                        <div className="text-slate-400 space-y-0.5 text-[11px]">
                          <div>Nome: <strong className="text-slate-200">{req.buyer_profile?.full_name || 'Cliente Autopia'}</strong></div>
                          {req.buyer_profile?.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span className="font-mono text-slate-200">{req.buyer_profile.phone}</span>
                            </div>
                          )}
                          {req.buyer_profile?.city && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{req.buyer_profile.city}</span>
                            </div>
                          )}
                          {req.buyer_note && (
                            <div className="mt-1 p-1.5 bg-slate-900 rounded border border-slate-800 text-amber-200/90 italic">
                              "{req.buyer_note}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Azioni del Demolitore se in attesa */}
                    {isPending && (
                      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setRejectingReq(req)}
                          className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rifiuta Richiesta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingReq(req)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Conferma e Riserva Pezzo</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SEZIONE ORDINI DEFINITIVI AUTOPIA SHOP */}
        {(activeTab === 'all' || activeTab === 'orders') && filteredOrders.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Ordini Conclusi & Spedizioni Autopia Shop ({filteredOrders.length})</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Ordini pagati online con pagamento protetto
              </span>
            </div>

            <div className="space-y-3">
              {filteredOrders.map((ord) => {
                const isShipped = ord.fulfillment_status === 'shipped' || ord.fulfillment_status === 'delivered' || ord.fulfillment_status === 'completed';

                return (
                  <div
                    key={ord.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          Ordine #{ord.order_number || ord.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isShipped
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {isShipped ? 'Spedito / Consegnato' : 'Pagato • Da Spedire'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Canale: <strong className="text-slate-200 capitalize">{ord.sale_channel || 'Autopia Shop'}</strong>
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center space-x-3">
                        <span>Data: <strong className="text-slate-200">{new Date(ord.created_at).toLocaleString('it-IT')}</strong></span>
                        <span className="text-emerald-400 font-mono font-bold text-sm">
                          Totale: €{Number(ord.total).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Dettagli Ricambio */}
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ord.inventory?.title || 'Ricambio non specificato'}</span>
                        </div>
                        <div className="text-slate-400 space-y-0.5 text-[11px]">
                          {ord.inventory?.oem_code && (
                            <div>Codice OEM: <strong className="text-slate-200 font-mono">{ord.inventory.oem_code}</strong></div>
                          )}
                          {ord.inventory?.position_note && (
                            <div>Scaffale: <strong className="text-amber-300">{ord.inventory.position_note}</strong></div>
                          )}
                          <div>Quantità: <strong className="text-slate-200">{ord.quantity} pz</strong> • Incasso netto venditore: <strong className="text-emerald-300">€{Number(ord.seller_amount).toFixed(2)}</strong></div>
                        </div>
                      </div>

                      {/* Destinazione e Spedizione */}
                      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          <span>Indirizzo di Consegna / Ritiro</span>
                        </div>
                        <div className="text-slate-400 space-y-0.5 text-[11px]">
                          <div>Destinatario: <strong className="text-slate-200">{ord.buyer_profile?.full_name || 'Cliente'}</strong></div>
                          {ord.shipping_address ? (
                            <div>Indirizzo: <span className="text-slate-200 font-medium">{ord.shipping_address}</span></div>
                          ) : (
                            <div>Metodo: <strong className="text-amber-300">{ord.delivery_method === 'pickup' ? 'Ritiro diretto al banco' : 'Spedizione standard'}</strong></div>
                          )}
                          {ord.tracking_number && (
                            <div className="mt-1 p-1 bg-slate-900 rounded font-mono text-[11px] text-purple-300 border border-purple-800/50">
                              Tracking ({ord.carrier || 'Corriere'}): {ord.tracking_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Azione di Spedizione per ordini non ancora evasi */}
                    {!isShipped && ord.delivery_method !== 'pickup' && (
                      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setFulfillingOrder(ord)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Inserisci Tracking e Spedisci</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. SEZIONE ORDINI EBAY */}
        {(activeTab === 'all' || activeTab === 'ebay') && filteredEbayOrders.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                <Globe className="w-4 h-4" />
                <span>Ordini Sincronizzati da eBay ({filteredEbayOrders.length})</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Canale Sandbox / Marketplace esterno
              </span>
            </div>

            <div className="space-y-3">
              {filteredEbayOrders.map((eo) => (
                <div
                  key={eo.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        eBay #{eo.ebay_order_id}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          eo.order_status === 'SHIPPED'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {eo.order_status === 'SHIPPED' ? 'Spedito' : 'Pagato • Da Spedire'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center space-x-3">
                      <span>Data: <strong className="text-slate-200">{new Date(eo.creation_date).toLocaleDateString('it-IT')}</strong></span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        €{eo.total_price.toFixed(2)} {eo.currency}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-slate-300">Articoli Venduti su eBay:</div>
                      {(eo.line_items || []).map((li: EbayOrderLineItem, idx: number) => (
                        <div key={idx} className="text-slate-300 text-[11px]">
                          • <strong className="text-slate-100">{li.title}</strong> (Qtà: {li.quantity}) {li.lineItemCost ? `- €${li.lineItemCost}` : ''}
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[11px] font-bold text-slate-300">Destinatario eBay:</div>
                      <div className="text-slate-400 text-[11px]">
                        <div>Utente: <strong className="text-slate-200">@{eo.buyer_username}</strong> {eo.buyer_name ? `(${eo.buyer_name})` : ''}</div>
                        {eo.shipping_address && (
                          <div className="truncate">Indirizzo: {eo.shipping_address.addressLine1 || ''}, {eo.shipping_address.city || ''}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CONFERMA RICHIESTA */}
      {confirmingReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Conferma Richiesta di Acquisto</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Stai confermando la disponibilità del ricambio{' '}
              <strong>"{confirmingReq.inventory?.title}"</strong> per il cliente.
              Lo stato del ricambio a magazzino verrà impostato su <strong>RISERVATO</strong> per evitare vendite duplicate.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingReq(null)}
                disabled={isSubmittingAction}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmRequest}
                disabled={isSubmittingAction}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center space-x-1.5"
              >
                {isSubmittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Conferma e Riserva</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIFIUTO RICHIESTA */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Rifiuta Richiesta di Acquisto</h3>
            </div>
            <p className="text-xs text-slate-300">
              Indica il motivo per cui non puoi evadere la richiesta per <strong>"{rejectingReq.inventory?.title}"</strong>:
            </p>
            <div className="space-y-2">
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
              >
                <option value="Pezzo non più disponibile a magazzino">Pezzo non più disponibile a magazzino</option>
                <option value="Danneggiato durante lo smontaggio">Danneggiato durante lo smontaggio</option>
                <option value="Incompatibile con il modello richiesto">Incompatibile con il modello richiesto</option>
                <option value="Altro">Altro motivo</option>
              </select>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Nota aggiuntiva per il cliente (opzionale)..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                disabled={isSubmittingAction}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleRejectRequest}
                disabled={isSubmittingAction}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs flex items-center space-x-1.5"
              >
                {isSubmittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Conferma Rifiuto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPEDIZIONE ORDINE */}
      {fulfillingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-2 text-blue-400">
              <Truck className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Registra Spedizione Ordine</h3>
            </div>
            <p className="text-xs text-slate-300">
              Inserisci i dettagli di spedizione per l'ordine #{fulfillingOrder.order_number || fulfillingOrder.id.slice(0, 8)}:
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Corriere</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
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
                <label className="text-[11px] text-slate-400 block mb-1">Codice di Tracking (Lettera di Vettura)</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Es. BRT123456789IT"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setFulfillingOrder(null)}
                disabled={isSubmittingAction}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleFulfillOrder}
                disabled={isSubmittingAction}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs flex items-center space-x-1.5"
              >
                {isSubmittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salva e Segna come Spedito</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
