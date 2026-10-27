import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Hash,
  DollarSign,
  Tag,
  MapPin,
  Car,
  ShoppingBag,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type {
  InventoryItem,
  InventoryFilters,
  PartCategory,
} from '../../types/inventory';
import type { SellerVehicle } from '../../types/vehicles';
import {
  fetchSellerInventory,
  deleteInventoryItem,
  fetchPartCategories,
} from '../../services/partsService';
import { fetchSellerVehicles } from '../../services/vehiclesService';
import { PartFormModal } from './PartFormModal';
import { PartDetailsModal } from './PartDetailsModal';

export const PartsManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const currentSeller = effectiveSellerProfile || sellerProfile;
  const sellerId = currentSeller?.id;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtri
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InventoryFilters['status']>('all');
  const [conditionFilter, setConditionFilter] = useState<InventoryFilters['condition']>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Modali
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Metadati per filtri
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [yardVehicles, setYardVehicles] = useState<SellerVehicle[]>([]);

  // Carica i dati dell'inventario
  const loadInventory = useCallback(async () => {
    if (!sellerId) return;
    setIsLoading(true);
    setError(null);

    const filters: InventoryFilters = {
      search: search.trim() || undefined,
      status: statusFilter,
      condition: conditionFilter,
      sellerVehicleId: vehicleFilter,
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
  }, [sellerId, search, statusFilter, conditionFilter, vehicleFilter, page]);

  // Carica metadati (veicoli piazzale e categorie ricambi)
  useEffect(() => {
    const sid = sellerId;
    if (!sid) return;
    let isMounted = true;
    async function fetchMeta() {
      if (!sid) return;
      try {
        const [catsRes, vehsRes] = await Promise.all([
          fetchPartCategories(),
          fetchSellerVehicles({
            sellerId: sid,
            filters: {},
            page: 1,
            pageSize: 200,
          }),
        ]);
        if (isMounted) {
          if (catsRes.data) setCategories(catsRes.data);
          if (vehsRes.data) setYardVehicles(vehsRes.data);
        }
      } catch (e) {
        console.warn('Errore lettura metadati inventario:', e);
      }
    }
    fetchMeta();
    return () => {
      isMounted = false;
    };
  }, [sellerId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Statistiche rapide calcolate
  const totalValue = items.reduce((acc, it) => acc + Number(it.price) * (it.quantity || 0), 0);
  const availableItemsCount = items.filter((it) => it.status === 'available').length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Eliminazione
  const confirmDelete = async () => {
    if (!sellerId || !itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteInventoryItem(sellerId, itemToDelete.id);
    setIsDeleting(false);
    if (res.success) {
      setItemToDelete(null);
      setDeleteError(null);
      if (detailsItem?.id === itemToDelete.id) {
        setDetailsItem(null);
      }
      loadInventory();
    } else {
      setDeleteError(res.error || 'Impossibile eliminare il ricambio dal magazzino');
    }
  };

  const conditionBadges: Record<string, { label: string; color: string }> = {
    ottimo: { label: 'Ottimo', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    buono: { label: 'Buono', color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' },
    discreto: { label: 'Discreto', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
    da_revisionare: { label: 'Da revisionare', color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' },
  };

  const statusBadges: Record<string, { label: string; color: string }> = {
    available: { label: 'Online', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    reserved: { label: 'Riservato', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
    sold: { label: 'Venduto', color: 'text-slate-400 bg-slate-900 border-slate-700' },
    inactive: { label: 'Offline', color: 'text-rose-400 bg-rose-950/60 border-rose-800/60' },
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-sans text-slate-100">
      {/* 1. Barra Superiore con Statistiche e Pulsante Nuovo */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Fase 2 • Magazzino Digitale
              </span>
              <span className="text-xs text-slate-400">
                {currentSeller?.business_name || 'Autodemolitore'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center space-x-2">
              <Package className="w-5 h-5 text-amber-400" />
              <span>Magazzino & Ricambi Smontati</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestione pezzi con codici OEM, scaffali fisici, prezzi e sincronizzazione in tempo reale con Autopia Shop.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => loadInventory()}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              title="Ricarica elenco ricambi"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Ricambio</span>
            </button>
          </div>
        </div>

        {/* Schede KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Totale Ricambi a Catalogo</span>
            </div>
            <div className="text-xl font-bold text-slate-100 mt-1">{totalCount}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Disponibili su Autopia Shop</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{availableItemsCount}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span>Valore Totale Pagina</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">€ {totalValue.toFixed(2)}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Car className="w-3 h-3 text-blue-400" />
              <span>Veicoli Piazzale Attivi</span>
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">{yardVehicles.length}</div>
          </div>
        </div>

        {/* Barra Filtri e Ricerca */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cerca per titolo, codice OEM, scaffale..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as InventoryFilters['status']);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutti gli stati disponibilità</option>
              <option value="available">Disponibile (Online)</option>
              <option value="reserved">Riservato</option>
              <option value="sold">Venduto / Esaurito</option>
              <option value="inactive">Non attivo / Offline</option>
            </select>
          </div>

          <div>
            <select
              value={conditionFilter}
              onChange={(e) => {
                setConditionFilter(e.target.value as InventoryFilters['condition']);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutte le condizioni</option>
              <option value="ottimo">Ottimo</option>
              <option value="buono">Buono</option>
              <option value="discreto">Discreto</option>
              <option value="da_revisionare">Da revisionare</option>
            </select>
          </div>

          <div>
            <select
              value={vehicleFilter}
              onChange={(e) => {
                setVehicleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutti i veicoli piazzale</option>
              {yardVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate ? `[${v.plate}] ` : ''}
                  {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Tabella Ricambi */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-xs">Caricamento inventario magazzino in corso...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-slate-900/40 rounded-xl border border-slate-800 border-dashed text-slate-400">
            <Package className="w-10 h-10 text-slate-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">Nessun ricambio trovato</p>
              <p className="text-xs text-slate-500 mt-1">
                {search || statusFilter !== 'all' || conditionFilter !== 'all' || vehicleFilter !== 'all'
                  ? 'Nessun risultato corrisponde ai filtri selezionati.'
                  : 'Il magazzino è ancora vuoto. Registra il primo ricambio smontato dal piazzale o carica un file CSV.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Ricambio</span>
            </button>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Ricambio</th>
                  <th className="py-3 px-4">Codice OEM / Interno</th>
                  <th className="py-3 px-4">Ubicazione</th>
                  <th className="py-3 px-4">Condizione</th>
                  <th className="py-3 px-4">Giacenza</th>
                  <th className="py-3 px-4">Prezzo</th>
                  <th className="py-3 px-4">Stato</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => setDetailsItem(item)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
                        {item.title}
                      </div>
                      {item.seller_vehicle_id && (
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Car className="w-3 h-3 text-slate-500" />
                          <span>Veicolo piazzale collegato</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-200 font-medium">{item.oem_code || '—'}</div>
                      {item.internal_code && (
                        <div className="text-[10px] text-slate-400">Int: {item.internal_code}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {item.position_note ? (
                        <span className="inline-flex items-center space-x-1 text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded text-[11px]">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{item.position_note}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Non indicato</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          conditionBadges[item.condition]?.color || 'text-slate-300'
                        }`}
                      >
                        {conditionBadges[item.condition]?.label || item.condition}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">
                        {item.quantity} <span className="text-[10px] text-slate-500 font-normal">pz</span>
                      </div>
                      {item.sold_quantity ? (
                        <div className="text-[10px] text-emerald-400">
                          {item.sold_quantity} venduti
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-400 text-sm">
                        € {Number(item.price).toFixed(2)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          statusBadges[item.status]?.color || 'text-slate-300'
                        }`}
                      >
                        {statusBadges[item.status]?.label || item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div
                        className="flex items-center justify-end space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailsItem(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Dettagli & Scarico banco"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                          title="Modifica ricambio"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          title="Elimina ricambio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Paginazione */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Visualizzazione di {items.length} su <strong>{totalCount}</strong> ricambi
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

      {/* Modal Form Ricambio */}
      {isFormOpen && sellerId && (
        <PartFormModal
          sellerId={sellerId}
          itemToEdit={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setIsFormOpen(false);
            setEditingItem(null);
            loadInventory();
          }}
        />
      )}

      {/* Modal Dettagli Ricambio & Scarico Vendita */}
      {detailsItem && sellerId && (
        <PartDetailsModal
          sellerId={sellerId}
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
          onEdit={(it) => {
            setDetailsItem(null);
            setEditingItem(it);
            setIsFormOpen(true);
          }}
          onDelete={(it) => {
            setItemToDelete(it);
          }}
          onUpdated={(updated) => {
            setDetailsItem(updated);
            loadInventory();
          }}
        />
      )}

      {/* Modal Conferma Eliminazione */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Elimina Ricambio</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sei sicuro di voler eliminare definitivamente dal magazzino il ricambio{' '}
              <strong className="text-slate-100 font-bold">"{itemToDelete.title}"</strong> (OEM:{' '}
              {itemToDelete.oem_code || 'Nessuno'})? Questa operazione non può essere annullata.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <span>Elimina Definitivamente</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
