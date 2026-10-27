import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  ExternalLink,
  Search,
  RefreshCw,
  ShoppingBag,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { InventoryItem, InventoryFilters } from '../../types/inventory';
import {
  fetchSellerInventory,
  updateInventoryItem,
  markInventorySoldOffline,
} from '../../services/partsService';

export const ListingsManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const currentSeller = effectiveSellerProfile || sellerProfile;
  const sellerId = currentSeller?.id;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InventoryFilters['status']>('available');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Stato per azione rapida scarico banco
  const [saleItem, setSaleItem] = useState<InventoryItem | null>(null);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Stato per toggle online/offline rapido
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadListings = useCallback(async () => {
    if (!sellerId) return;
    setIsLoading(true);
    setError(null);

    const filters: InventoryFilters = {
      search: search.trim() || undefined,
      status: statusFilter,
    };

    const res = await fetchSellerInventory({
      sellerId,
      filters,
      page,
      pageSize,
    });

    if (res.error) {
      setError(res.error);
    } else {
      setItems(res.data);
      setTotalCount(res.totalCount);
    }
    setIsLoading(false);
  }, [sellerId, search, statusFilter, page]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Gestione toggle visibilità online con controllo scorte
  const handleToggleStatus = async (item: InventoryItem) => {
    if (!sellerId) return;
    setActionFeedback(null);

    // Blocco esplicito se la giacenza è zero o esaurita
    if (item.status !== 'available' && (!item.quantity || item.quantity <= 0)) {
      setActionFeedback({
        type: 'error',
        message: `Impossibile attivare online "${item.title}": la giacenza a magazzino è pari a 0 pezzi. Per garantire affidabilità agli acquirenti di Autopia Shop, ricarica prima la disponibilità.`,
      });
      return;
    }

    setTogglingId(item.id);
    const newStatus = item.status === 'available' ? 'inactive' : 'available';
    try {
      const res = await updateInventoryItem(sellerId, item.id, { status: newStatus });
      if (res.error) {
        setActionFeedback({
          type: 'error',
          message: `Errore aggiornamento annuncio: ${res.error}`,
        });
      } else if (res.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
        );
        setActionFeedback({
          type: 'success',
          message:
            newStatus === 'available'
              ? `Annuncio "${item.title}" attivato online con successo.`
              : `Annuncio "${item.title}" impostato offline / sospeso dal marketplace.`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eccezione cambio visibilità';
      setActionFeedback({ type: 'error', message: msg });
    } finally {
      setTogglingId(null);
    }
  };

  // Esecuzione scarico vendita al banco
  const handleConfirmSale = async () => {
    if (!sellerId || !saleItem) return;
    if (saleQuantity < 1 || saleQuantity > saleItem.quantity) {
      setSaleError(`Quantità non valida. Massimo disponibile: ${saleItem.quantity}`);
      return;
    }

    setIsProcessingSale(true);
    setSaleError(null);

    try {
      const res = await markInventorySoldOffline(sellerId, saleItem.id, saleQuantity);
      if (res.error || !res.data) {
        setSaleError(res.error || 'Errore durante lo scarico vendita');
      } else {
        setSaleItem(null);
        loadListings();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eccezione scarico';
      setSaleError(msg);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Statistiche calcolate
  const totalPageValue = items.reduce((acc, it) => acc + Number(it.price) * (it.quantity || 0), 0);
  const totalSoldInView = items.reduce((acc, it) => acc + (it.sold_quantity || 0), 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-sans text-slate-100">
      {/* Intestazione */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center space-x-1">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Marketplace Autopia Shop Sync</span>
              </span>
              <span className="text-xs text-slate-400">
                {currentSeller?.business_name || 'Autodemolitore'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center space-x-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <span>Annunci & Visibilità Online</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Controllo immediato delle inserzioni visibili su <strong className="text-emerald-400">autopiashop.it</strong> e gestione scarico rapido vendite al banco.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="https://autopiashop.it"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors border border-slate-700"
            >
              <span>Vedi Marketplace</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </a>

            <button
              type="button"
              onClick={() => loadListings()}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              title="Ricarica annunci"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Schede KPI Marketplace */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Annunci Filtrati</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{totalCount}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span>Valore Listino Vista</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">€ {totalPageValue.toFixed(2)}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <ShoppingBag className="w-3 h-3 text-blue-400" />
              <span>Pezzi Venduti Vista</span>
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">{totalSoldInView} pz</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span>Stato Venditore</span>
            </div>
            <div className="text-xs font-bold text-slate-100 uppercase mt-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                {currentSeller?.status || 'APPROVED'}
              </span>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cerca annuncio per titolo ricambio, codice OEM o matricola..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as InventoryFilters['status']);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="available">Solo Annunci Attivi (Online)</option>
              <option value="inactive">Annunci Sospesi (Offline)</option>
              <option value="reserved">Annunci Riservati</option>
              <option value="sold">Annunci Venduti / Esauriti</option>
              <option value="all">Tutti gli annunci</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista Annunci */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Banner Notifica Operazione Annuncio */}
        {actionFeedback && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : 'bg-red-950/60 border-red-800/80 text-red-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5"
            >
              Chiudi
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs">Sincronizzazione annunci con il catalogo...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-slate-900/40 rounded-xl border border-slate-800 border-dashed text-slate-400">
            <Store className="w-10 h-10 text-slate-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">Nessun annuncio in questo stato</p>
              <p className="text-xs text-slate-500 mt-1">
                Modifica i filtri o attiva nuovi ricambi dal modulo Magazzino.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isOnline = item.status === 'available';
              const isToggling = togglingId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border flex items-center space-x-1 ${
                              isOnline
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                              }`}
                            />
                            <span>{isOnline ? 'Online su Autopia' : item.status.toUpperCase()}</span>
                          </span>

                          {item.oem_code && (
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              OEM: {item.oem_code}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-100 mt-1.5 line-clamp-1">
                          {item.title}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-amber-400">
                          € {Number(item.price).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Giacenza: <strong>{item.quantity}</strong> pz
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/60">
                      <div>
                        Condizione:{' '}
                        <span className="text-slate-200 capitalize font-medium">{item.condition}</span>
                      </div>
                      <div>
                        Scaffale:{' '}
                        <span className="text-amber-300 font-medium">{item.position_note || '—'}</span>
                      </div>
                      <div>
                        Venduti:{' '}
                        <span className="text-emerald-400 font-medium">{item.sold_quantity || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pulsantiera Rapida Annuncio */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(item)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                        isOnline
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isOnline ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Metti Offline</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pubblica Online</span>
                        </>
                      )}
                    </button>

                    {item.quantity > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSaleItem(item);
                          setSaleQuantity(1);
                          setSaleError(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Scarico Vendita Banco</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Visualizzazione di {items.length} su <strong>{totalCount}</strong> inserzioni
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Pagina <strong>{page}</strong> di <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Scarico Rapido Vendita al Banco */}
      {saleItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl font-sans">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Registra Vendita al Banco</h3>
                <p className="text-xs text-slate-400">Scarico rapido giacenza da officina</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
              <div className="font-semibold text-slate-200">{saleItem.title}</div>
              <div className="text-slate-400 font-mono">OEM: {saleItem.oem_code || 'N/D'}</div>
              <div className="text-amber-400 font-bold text-sm pt-1">
                Prezzo unitario: € {Number(saleItem.price).toFixed(2)}
              </div>
              <div className="text-slate-400">
                Giacenza attuale disponibile: <strong className="text-slate-200">{saleItem.quantity}</strong> pezzi
              </div>
            </div>

            {saleError && (
              <div className="p-2.5 rounded bg-red-950/60 border border-red-800/80 text-red-300 text-xs">
                {saleError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium block">
                Quantità Venduta al Cliente:
              </label>
              <input
                type="number"
                min="1"
                max={saleItem.quantity}
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 bg-slate-950/80 rounded border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              Lo scarico ridurrà immediatamente la disponibilità del ricambio. Se la giacenza residua arriva a 0, l'annuncio verrà automaticamente contrassegnato come <strong className="text-slate-300">VENDUTO</strong> su Autopia Shop per prevenire ordini duplicati.
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isProcessingSale}
                onClick={() => setSaleItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isProcessingSale}
                onClick={handleConfirmSale}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
              >
                {isProcessingSale ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registrazione in corso...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Conferma Scarico Banco</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
