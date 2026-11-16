import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  Car,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Globe,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import type { InventoryItem, InventoryFilters } from '../../types/inventory';
import type { SellerVehicle } from '../../types/vehicles';
import {
  fetchSellerInventory,
  deleteInventoryItem,
  updateInventoryItem,
} from '../../services/partsService';
import { fetchSellerVehicles } from '../../services/vehiclesService';
import { downloadCsvFile } from '../../utils/csvExport';
import { PartFormModal } from './PartFormModal';
import { PartDetailsModal } from './PartDetailsModal';
import {
  uiClasses,
  Button,
  KpiCard,
  StatusBadge,
  AlertBanner,
  LoadingState,
  EmptyState,
  SectionHeader,
  type BadgeTone,
} from '../ui/DesignSystem';

export const PartsManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const { refreshSnapshot } = useDashboard();
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

  // Selezione multipla & azioni massive
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = useState<boolean>(false);
  const [bulkNotice, setBulkNotice] = useState<{
    tone: 'success' | 'warning' | 'danger';
    message: string;
  } | null>(null);

  // Modali
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Metadati per filtri
  const [yardVehicles, setYardVehicles] = useState<SellerVehicle[]>([]);

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
      setSelectedIds(new Set());
    }
    setIsLoading(false);
  }, [sellerId, search, statusFilter, conditionFilter, vehicleFilter, page]);

  useEffect(() => {
    const sid = sellerId;
    if (!sid) return;
    let isMounted = true;
    async function fetchMeta() {
      if (!sid) return;
      try {
        const vehsRes = await fetchSellerVehicles({
          sellerId: sid,
          filters: {},
          page: 1,
          pageSize: 200,
        });
        if (isMounted && vehsRes.data) {
          setYardVehicles(vehsRes.data);
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

  const totalValue = items.reduce((acc, it) => acc + Number(it.price) * (it.quantity || 0), 0);
  const availableItemsCount = items.filter((it) => it.status === 'available').length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const toggleSelectAllVisible = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (targetStatus: 'available' | 'inactive') => {
    if (!sellerId || selectedIds.size === 0) return;
    setIsBulkRunning(true);
    setBulkNotice(null);

    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    let updatedCount = 0;
    let skippedNoPriceOrQty = 0;

    for (const item of selectedItems) {
      if (targetStatus === 'available' && (Number(item.price) <= 0 || item.quantity <= 0)) {
        skippedNoPriceOrQty += 1;
        continue;
      }
      const res = await updateInventoryItem(sellerId, item.id, { status: targetStatus });
      if (!res.error && res.data) {
        updatedCount += 1;
      }
    }

    setIsBulkRunning(false);
    await loadInventory();
    refreshSnapshot();

    if (skippedNoPriceOrQty > 0) {
      setBulkNotice({
        tone: 'warning',
        message: `Aggiornati ${updatedCount} ricambi. ${skippedNoPriceOrQty} bozze saltate perché prive di prezzo > 0 € o con giacenza 0.`,
      });
    } else {
      setBulkNotice({
        tone: 'success',
        message: `${updatedCount} ricambi impostati come ${
          targetStatus === 'available' ? 'Pubblicati Online' : 'Bozza Offline'
        }.`,
      });
    }
  };

  const handleExportCsv = () => {
    const sourceRows =
      selectedIds.size > 0 ? items.filter((i) => selectedIds.has(i.id)) : items;
    if (sourceRows.length === 0) return;

    const headers = [
      'Titolo',
      'Codice OEM',
      'Codice Interno',
      'Condizione',
      'Lato',
      'Ubicazione',
      'Giacenza',
      'Venduti',
      'Prezzo EUR',
      'Stato',
    ];

    const rows = sourceRows.map((i) => [
      i.title,
      i.oem_code || '',
      i.internal_code || '',
      i.condition,
      i.side || '',
      i.position_note || '',
      i.quantity,
      i.sold_quantity || 0,
      Number(i.price).toFixed(2),
      i.status,
    ]);

    const dateTag = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`magazzino_autopia_${dateTag}.csv`, headers, rows);
  };

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
      refreshSnapshot();
    } else {
      setDeleteError(res.error || 'Impossibile eliminare il ricambio dal magazzino');
    }
  };

  const conditionMeta: Record<string, { label: string; tone: BadgeTone }> = {
    ottimo: { label: 'Ottimo', tone: 'success' },
    buono: { label: 'Buono', tone: 'info' },
    discreto: { label: 'Discreto', tone: 'warning' },
    da_revisionare: { label: 'Da revisionare', tone: 'neutral' },
  };

  const renderStatusBadge = (item: InventoryItem) => {
    if (item.status === 'available') {
      return <StatusBadge tone="success">Pubblicato</StatusBadge>;
    }
    if (item.status === 'inactive') {
      if (!item.price || Number(item.price) <= 0) {
        return <StatusBadge tone="warning">Bozza (€0)</StatusBadge>;
      }
      return <StatusBadge tone="info">Pronto offline</StatusBadge>;
    }
    if (item.status === 'reserved') {
      return <StatusBadge tone="warning">Riservato</StatusBadge>;
    }
    return <StatusBadge tone="neutral">Venduto</StatusBadge>;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#EEF2F3] font-sans text-[#131C1B]">
      {/* Header & KPI */}
      <div className="px-6 py-5 bg-white border-b border-[#DCE4E2] space-y-4 shrink-0">
        <SectionHeader
          icon={<Package className="w-5 h-5" />}
          title="Magazzino & Scaffalature Ricambi"
          description="Gestisci codici OEM, ubicazioni, giacenze, azioni massive ed esportazione report CSV."
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                disabled={items.length === 0}
                title="Esporta la vista corrente o gli articoli selezionati in CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#074E44]" />
                <span>
                  {selectedIds.size > 0
                    ? `Esporta CSV (${selectedIds.size})`
                    : 'Esporta CSV'}
                </span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadInventory()}
                disabled={isLoading}
                title="Ricarica elenco ricambi"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#074E44]' : ''}`}
                />
                <span>Aggiorna</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Nuovo Ricambio</span>
              </Button>
            </>
          }
        />

        {/* Schede KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Ricambi filtrati"
            value={totalCount.toLocaleString('it-IT')}
            icon={<Layers className="w-4 h-4" />}
          />
          <KpiCard
            label="Online su Shop (vista)"
            value={availableItemsCount.toLocaleString('it-IT')}
            icon={<CheckCircle2 className="w-4 h-4" />}
            accent="success"
          />
          <KpiCard
            label="Valore pagina corrente"
            value={`€ ${totalValue.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={<DollarSign className="w-4 h-4" />}
            accent="brand"
          />
          <KpiCard
            label="Veicoli piazzale"
            value={yardVehicles.length.toLocaleString('it-IT')}
            icon={<Car className="w-4 h-4" />}
            accent="cyan"
          />
        </div>

        {/* Barra Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#7C8E8A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cerca titolo, codice OEM, scaffale..."
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
            <option value="all">Tutti gli stati (Bozze & Online)</option>
            <option value="inactive">Bozze Offline / In lavorazione</option>
            <option value="available">Pubblicati Online (Disponibili)</option>
            <option value="reserved">Riservati</option>
            <option value="sold">Venduti / Esauriti</option>
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value as InventoryFilters['condition']);
              setPage(1);
            }}
            className={uiClasses.select}
          >
            <option value="all">Tutte le condizioni</option>
            <option value="ottimo">Ottimo</option>
            <option value="buono">Buono</option>
            <option value="discreto">Discreto</option>
            <option value="da_revisionare">Da revisionare</option>
          </select>

          <select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setPage(1);
            }}
            className={uiClasses.select}
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

        {/* Barra Azioni Massive Contestuale */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 bg-[#121B1A] text-white rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs px-1.5">
              <span className="font-mono font-bold text-[#5EEAD4] tabular-nums">
                {selectedIds.size} selezionat{selectedIds.size === 1 ? 'o' : 'i'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-[#9BB0AB] hover:text-white underline cursor-pointer"
              >
                Deseleziona
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="success"
                size="xs"
                loading={isBulkRunning}
                onClick={() => handleBulkStatus('available')}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Pubblica Online</span>
              </Button>
              <Button
                variant="dark"
                size="xs"
                loading={isBulkRunning}
                onClick={() => handleBulkStatus('inactive')}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Sposta Offline</span>
              </Button>
              <Button variant="dark" size="xs" onClick={handleExportCsv}>
                <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Esporta CSV</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Contenuto Tabella */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {bulkNotice && (
          <AlertBanner tone={bulkNotice.tone} onDismiss={() => setBulkNotice(null)}>
            {bulkNotice.message}
          </AlertBanner>
        )}

        {isLoading ? (
          <LoadingState message="Caricamento inventario magazzino in corso..." />
        ) : error ? (
          <AlertBanner tone="danger" title="Errore caricamento magazzino">
            {error}
          </AlertBanner>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Nessun ricambio trovato"
            description={
              search ||
              statusFilter !== 'all' ||
              conditionFilter !== 'all' ||
              vehicleFilter !== 'all'
                ? 'Nessun risultato corrisponde ai filtri selezionati.'
                : 'Il magazzino è ancora vuoto. Registra il primo ricambio smontato o importa un file CSV.'
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi Ricambio</span>
              </Button>
            }
          />
        ) : (
          <div className={uiClasses.tableWrapper}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={uiClasses.tableHeadRow}>
                    <th className="py-3 pl-4 pr-2 w-9">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selectedIds.size === items.length}
                        onChange={toggleSelectAllVisible}
                        aria-label="Seleziona tutti i ricambi visibili"
                        className="rounded border-[#B8C7C4] text-[#074E44] focus:ring-[#074E44] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">Ricambio</th>
                    <th className="py-3 px-4">Codice OEM / Interno</th>
                    <th className="py-3 px-4">Ubicazione</th>
                    <th className="py-3 px-4">Condizione</th>
                    <th className="py-3 px-4">Giacenza</th>
                    <th className="py-3 px-4">Prezzo</th>
                    <th className="py-3 px-4">Stato</th>
                    <th className="py-3 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F1]">
                  {items.map((item) => {
                    const cond = conditionMeta[item.condition];
                    const isChecked = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors cursor-pointer group ${
                          isChecked ? 'bg-[#EAF3F1]/65' : 'hover:bg-[#F6F9F8]'
                        }`}
                        onClick={() => setDetailsItem(item)}
                      >
                        <td
                          className="py-3 pl-4 pr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(item.id)}
                            aria-label={`Seleziona ${item.title}`}
                            className="rounded border-[#B8C7C4] text-[#074E44] focus:ring-[#074E44] cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-[#131C1B] group-hover:text-[#074E44] transition-colors">
                            {item.title}
                          </div>
                          {item.seller_vehicle_id && (
                            <div className="text-[11px] text-[#566663] flex items-center gap-1 mt-0.5">
                              <Car className="w-3 h-3 text-[#0D9488]" />
                              <span>Veicolo piazzale associato</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="text-[#131C1B] font-semibold">
                            {item.oem_code || '—'}
                          </div>
                          {item.internal_code && (
                            <div className="text-[11px] text-[#566663]">
                              Int: {item.internal_code}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {item.position_note ? (
                            <span className="inline-flex items-center gap-1 text-[#074E44] font-medium">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0D9488]" />
                              <span className="truncate max-w-[150px]">{item.position_note}</span>
                            </span>
                          ) : (
                            <span className="text-[#82938F]">Non indicata</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <StatusBadge tone={cond?.tone || 'neutral'}>
                            {cond?.label || item.condition}
                          </StatusBadge>
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          <div
                            className={`font-bold font-mono ${
                              item.quantity <= 0 ? 'text-red-700' : 'text-[#131C1B]'
                            }`}
                          >
                            {item.quantity} pz
                          </div>
                          {item.sold_quantity ? (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              {item.sold_quantity} venduti
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          <div
                            className={`font-bold font-mono text-sm ${
                              Number(item.price) <= 0 ? 'text-amber-700' : 'text-[#074E44]'
                            }`}
                          >
                            € {Number(item.price).toFixed(2)}
                          </div>
                        </td>

                        <td className="py-3 px-4">{renderStatusBadge(item)}</td>

                        <td className="py-3 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setDetailsItem(item)}
                              className="p-1.5 text-[#566663] hover:text-[#074E44] hover:bg-[#EAF3F1] rounded-lg transition-colors cursor-pointer"
                              title="Dettagli & Scarico banco"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 text-[#566663] hover:text-[#074E44] hover:bg-[#EAF3F1] rounded-lg transition-colors cursor-pointer"
                              title="Modifica ricambio"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 text-[#566663] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Elimina ricambio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-[#DCE4E2] bg-white flex items-center justify-between text-xs text-[#566663] shrink-0">
          <div className="tabular-nums">
            Visualizzazione di <strong className="text-[#131C1B]">{items.length}</strong> su{' '}
            <strong className="text-[#131C1B]">{totalCount}</strong> ricambi
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
            <span className="px-2 tabular-nums font-mono">
              {page} / {totalPages}
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
            refreshSnapshot();
          }}
          onCreatedKeepOpen={() => {
            loadInventory();
            refreshSnapshot();
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
            refreshSnapshot();
          }}
        />
      )}

      {/* Modal Conferma Eliminazione */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0F1615]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE4E2] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-700">
                <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#131C1B]">Elimina Ricambio</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteError(null);
                }}
                className="p-1 text-[#566663] hover:text-[#131C1B] rounded-lg hover:bg-[#F3F6F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#334441] leading-relaxed">
              Sei sicuro di voler eliminare definitivamente dal magazzino il ricambio{' '}
              <strong className="text-[#131C1B]">&ldquo;{itemToDelete.title}&rdquo;</strong> (OEM:{' '}
              <span className="font-mono">{itemToDelete.oem_code || 'Nessuno'}</span>)? Questa
              operazione non può essere annullata.
            </p>

            {deleteError && <AlertBanner tone="danger">{deleteError}</AlertBanner>}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EEF2F1]">
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteError(null);
                }}
              >
                Annulla
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isDeleting}
                onClick={confirmDelete}
              >
                {isDeleting ? 'Eliminazione...' : 'Elimina Definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
