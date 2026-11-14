import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  ExternalLink,
  Search,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Globe,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { InventoryItem, InventoryFilters } from '../../types/inventory';
import {
  fetchSellerInventory,
  updateInventoryItem,
  markInventorySoldOffline,
} from '../../services/partsService';
import { openExternalUrl } from '../../services/externalLinkService';
import {
  uiClasses,
  Button,
  KpiCard,
  StatusBadge,
  AlertBanner,
  LoadingState,
  EmptyState,
} from '../ui/DesignSystem';

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

  const [saleItem, setSaleItem] = useState<InventoryItem | null>(null);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

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

  const handleToggleStatus = async (item: InventoryItem) => {
    if (!sellerId) return;
    setActionFeedback(null);

    if (item.status !== 'available' && (!item.quantity || item.quantity <= 0)) {
      setActionFeedback({
        type: 'error',
        message: `Impossibile attivare online "${item.title}": la giacenza a magazzino è pari a 0 pezzi. Ricarica prima la disponibilità.`,
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

  const totalPageValue = items.reduce((acc, it) => acc + Number(it.price) * (it.quantity || 0), 0);
  const totalSoldInView = items.reduce((acc, it) => acc + (it.sold_quantity || 0), 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7F7] font-sans text-[#1A2322]">
      {/* Intestazione */}
      <div className="px-6 py-5 bg-white border-b border-[#E2E8E7] space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#5C6B68]">
              <span className="font-semibold text-[#074E44]">
                {currentSeller?.business_name || 'Autodemolitore'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#0D9488]" />
                <span>Autopia Shop Sync</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#162220] mt-0.5 flex items-center gap-2">
              <Store className="w-5 h-5 text-[#074E44]" />
              <span>Annunci & Visibilità Online</span>
            </h1>
            <p className="text-xs text-[#5C6B68] mt-0.5">
              Controlla le inserzioni pubblicate su <strong className="text-[#074E44]">autopiashop.it</strong> e registra eventuali vendite al banco.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openExternalUrl('https://autopiashop.it')}
            >
              <span>Apri Autopia Shop</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#074E44]" />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadListings()}
              disabled={isLoading}
              title="Ricarica annunci"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#074E44]' : ''}`} />
              <span>Aggiorna</span>
            </Button>
          </div>
        </div>

        {/* Schede KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Annunci filtrati"
            value={totalCount.toLocaleString('it-IT')}
            icon={<CheckCircle2 className="w-4 h-4" />}
            accent="success"
          />
          <KpiCard
            label="Valore listino vista"
            value={`€ ${totalPageValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-4 h-4" />}
            accent="brand"
          />
          <KpiCard
            label="Pezzi venduti (vista)"
            value={`${totalSoldInView} pz`}
            icon={<ShoppingBag className="w-4 h-4" />}
          />
          <div className="bg-white border border-[#E2E8E7] rounded-xl p-4 shadow-[0_1px_2px_rgba(7,78,68,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-[#5C6B68]">
              <span>Stato venditore</span>
              <TrendingUp className="w-4 h-4 text-[#074E44]/80" />
            </div>
            <div className="mt-2">
              <StatusBadge tone="success">
                {(currentSeller?.status || 'approved').toUpperCase()}
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8A9895]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cerca annuncio per titolo ricambio, codice OEM o matricola..."
              className={`${uiClasses.input} pl-8`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as InventoryFilters['status']);
              setPage(1);
            }}
            className={uiClasses.select}
          >
            <option value="available">Solo Annunci Attivi (Online)</option>
            <option value="inactive">Annunci Sospesi (Offline)</option>
            <option value="reserved">Annunci Riservati</option>
            <option value="sold">Annunci Venduti / Esauriti</option>
            <option value="all">Tutti gli annunci</option>
          </select>
        </div>
      </div>

      {/* Lista Annunci */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {actionFeedback && (
          <AlertBanner
            tone={actionFeedback.type === 'success' ? 'success' : 'danger'}
            onDismiss={() => setActionFeedback(null)}
          >
            {actionFeedback.message}
          </AlertBanner>
        )}

        {isLoading ? (
          <LoadingState message="Sincronizzazione annunci con il catalogo..." />
        ) : error ? (
          <AlertBanner tone="danger" title="Errore caricamento annunci">
            {error}
          </AlertBanner>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Store className="w-6 h-6" />}
            title="Nessun annuncio in questo stato"
            description="Modifica i filtri o attiva nuovi ricambi dalla sezione Magazzino & Ricambi."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isOnline = item.status === 'available';
              const isToggling = togglingId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#E2E8E7] hover:border-[#C6DFDA] rounded-xl p-4 flex flex-col justify-between space-y-4 transition-colors shadow-[0_1px_2px_rgba(7,78,68,0.03)]"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={isOnline ? 'success' : 'neutral'}>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            <span>{isOnline ? 'Online su Autopia' : item.status.toUpperCase()}</span>
                          </StatusBadge>

                          {item.oem_code && (
                            <span className="font-mono text-[11px] text-[#5C6B68] bg-[#FAFBFB] px-2 py-0.5 rounded border border-[#E2E8E7]">
                              OEM: {item.oem_code}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-[#162220] mt-2 line-clamp-1">
                          {item.title}
                        </h3>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-base font-bold text-[#074E44]">
                          € {Number(item.price).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[#5C6B68]">
                          Giacenza: <strong className="text-[#1A2322]">{item.quantity}</strong> pz
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2.5 text-[11px] text-[#5C6B68] border-t border-[#EEF2F1]">
                      <div>
                        Condizione:{' '}
                        <span className="text-[#1A2322] capitalize font-semibold">{item.condition}</span>
                      </div>
                      <div className="truncate">
                        Scaffale:{' '}
                        <span className="text-[#074E44] font-semibold">{item.position_note || '—'}</span>
                      </div>
                      <div className="tabular-nums">
                        Venduti:{' '}
                        <span className="text-emerald-700 font-semibold">{item.sold_quantity || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#EEF2F1]">
                    <Button
                      variant={isOnline ? 'secondary' : 'success'}
                      size="xs"
                      disabled={isToggling}
                      loading={isToggling}
                      onClick={() => handleToggleStatus(item)}
                    >
                      {!isToggling &&
                        (isOnline ? (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ))}
                      <span>{isOnline ? 'Metti Offline' : 'Pubblica Online'}</span>
                    </Button>

                    {item.quantity > 0 && (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => {
                          setSaleItem(item);
                          setSaleQuantity(1);
                          setSaleError(null);
                        }}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Scarico Vendita Banco</span>
                      </Button>
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
        <div className="px-6 py-3 border-t border-[#E2E8E7] bg-white flex items-center justify-between text-xs text-[#5C6B68] shrink-0">
          <div className="tabular-nums">
            Visualizzazione di <strong className="text-[#1A2322]">{items.length}</strong> su{' '}
            <strong className="text-[#1A2322]">{totalCount}</strong> inserzioni
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 tabular-nums">
              Pagina <strong className="text-[#1A2322]">{page}</strong> di{' '}
              <strong className="text-[#1A2322]">{totalPages}</strong>
            </span>
            <Button
              variant="secondary"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Scarico Rapido Vendita al Banco */}
      {saleItem && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8E7] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EAF3F1] border border-[#C6DFDA] text-[#074E44] rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#162220]">Registra Vendita al Banco</h3>
                  <p className="text-xs text-[#5C6B68]">Scarico rapido giacenza da officina</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleItem(null)}
                className="p-1 text-[#5C6B68] hover:text-[#1A2322] rounded-lg hover:bg-[#F3F6F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7] space-y-1 text-xs">
              <div className="font-bold text-[#1A2322]">{saleItem.title}</div>
              <div className="text-[#5C6B68] font-mono">OEM: {saleItem.oem_code || 'N/D'}</div>
              <div className="text-[#074E44] font-bold text-sm pt-1 tabular-nums">
                Prezzo unitario: € {Number(saleItem.price).toFixed(2)}
              </div>
              <div className="text-[#5C6B68] tabular-nums">
                Giacenza attuale disponibile:{' '}
                <strong className="text-[#1A2322]">{saleItem.quantity}</strong> pezzi
              </div>
            </div>

            {saleError && <AlertBanner tone="danger">{saleError}</AlertBanner>}

            <div>
              <label className={uiClasses.label}>Quantità Venduta al Cliente</label>
              <input
                type="number"
                min="1"
                max={saleItem.quantity}
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className={`${uiClasses.input} text-sm font-bold tabular-nums`}
              />
            </div>

            <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#E2E8E7] text-[11px] text-[#5C6B68] leading-relaxed">
              Lo scarico ridurrà immediatamente la disponibilità. Se la giacenza residua arriva a 0,
              l'annuncio verrà contrassegnato come <strong className="text-[#1A2322]">VENDUTO</strong> su
              Autopia Shop per prevenire ordini duplicati.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEF2F1]">
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessingSale}
                onClick={() => setSaleItem(null)}
              >
                Annulla
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isProcessingSale}
                onClick={handleConfirmSale}
              >
                {!isProcessingSale && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isProcessingSale ? 'Registrazione...' : 'Conferma Scarico Banco'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
