import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  Database as DatabaseIcon,
  Sparkles,
} from 'lucide-react';
import type {
  SellerVehicle,
  VehicleFilters,
  CatalogVehicle,
  CatalogBrowseFilters,
  CatalogMakeInfo,
} from '../../types/vehicles';
import {
  VEHICLE_STATUS_OPTIONS,
  FUEL_TYPE_OPTIONS,
} from '../../types/vehicles';
import {
  fetchSellerVehicles,
  browseCatalogVehicles,
  fetchCatalogMakes,
  fetchCatalogModels,
  fetchCatalogTotalCount,
  clearCatalogCache,
} from '../../services/vehiclesService';
import { VehicleFormModal } from './VehicleFormModal';
import { VehicleDetailsModal } from './VehicleDetailsModal';
import { DeleteVehicleModal } from './DeleteVehicleModal';
import { VehiclePartsExtractorModal } from './VehiclePartsExtractorModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertBanner,
  Button,
  EmptyState,
  LoadingState,
  StatusBadge,
  uiClasses,
} from '../ui/DesignSystem';

export const VehiclesManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const currentSeller = effectiveSellerProfile || sellerProfile;
  const sellerId = currentSeller?.id;

  const [activeTab, setActiveTab] = useState<'yard' | 'catalog'>('yard');

  // TAB 1: Parco Veicoli
  const [vehicles, setVehicles] = useState<SellerVehicle[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // TAB 2: Catalogo Centrale
  const [catalogVehicles, setCatalogVehicles] = useState<CatalogVehicle[]>([]);
  const [catalogTotalCount, setCatalogTotalCount] = useState<number>(11346);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const catalogPageSize = 15;

  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogDebouncedSearch, setCatalogDebouncedSearch] = useState<string>('');
  const [catalogMakes, setCatalogMakes] = useState<string[]>([]);
  const [catalogMakeDetails, setCatalogMakeDetails] = useState<CatalogMakeInfo[]>([]);
  const [selectedCatalogMake, setSelectedCatalogMake] = useState<string>('');
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [selectedCatalogModel, setSelectedCatalogModel] = useState<string>('');
  const [selectedCatalogFuel, setSelectedCatalogFuel] = useState<string>('all');
  const [selectedCatalogYear, setSelectedCatalogYear] = useState<string>('');
  const [selectedCatalogBody, setSelectedCatalogBody] = useState<string>('all');
  const [isRefreshingCache, setIsRefreshingCache] = useState<boolean>(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // Modali
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<SellerVehicle | null>(null);
  const [catalogVehicleToRegister, setCatalogVehicleToRegister] = useState<CatalogVehicle | null>(null);

  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState<SellerVehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<SellerVehicle | null>(null);
  const [extractorVehicle, setExtractorVehicle] = useState<SellerVehicle | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 350);
  };

  const catalogDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleCatalogSearchChange = (val: string) => {
    setCatalogSearch(val);
    if (catalogDebounceRef.current) clearTimeout(catalogDebounceRef.current);
    catalogDebounceRef.current = setTimeout(() => {
      setCatalogDebouncedSearch(val);
      setCatalogPage(1);
    }, 350);
  };

  const loadVehicles = useCallback(async () => {
    if (!sellerId) return;

    setIsLoading(true);
    setFetchError(null);

    const filters: VehicleFilters = {
      search: debouncedSearch,
      status: statusFilter,
      year: yearFilter ? Number(yearFilter) : null,
      fuelType: fuelFilter,
    };

    try {
      const response = await fetchSellerVehicles({
        sellerId,
        filters,
        page: currentPage,
        pageSize,
      });

      if (response.error) {
        setFetchError(response.error);
        setVehicles([]);
        setTotalCount(0);
      } else {
        setVehicles(response.data);
        setTotalCount(response.totalCount);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Errore imprevisto durante il caricamento');
      setVehicles([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [sellerId, debouncedSearch, statusFilter, fuelFilter, yearFilter, currentPage, pageSize]);

  useEffect(() => {
    if (activeTab === 'yard') {
      loadVehicles();
    }
  }, [activeTab, loadVehicles]);

  const loadCatalogData = useCallback(async () => {
    setIsCatalogLoading(true);
    setCatalogError(null);

    const filters: CatalogBrowseFilters = {
      search: catalogDebouncedSearch,
      make: selectedCatalogMake,
      model: selectedCatalogModel,
      fuelType: selectedCatalogFuel,
      year: selectedCatalogYear ? Number(selectedCatalogYear) : null,
      bodyStyle: selectedCatalogBody,
    };

    try {
      const res = await browseCatalogVehicles({
        page: catalogPage,
        pageSize: catalogPageSize,
        filters,
      });

      if (res.error) {
        setCatalogError(res.error);
        setCatalogVehicles([]);
      } else {
        setCatalogVehicles(res.data);
        setCatalogTotalCount(res.totalCount);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore caricamento catalogo';
      setCatalogError(msg);
      setCatalogVehicles([]);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [
    catalogPage,
    catalogPageSize,
    catalogDebouncedSearch,
    selectedCatalogMake,
    selectedCatalogModel,
    selectedCatalogFuel,
    selectedCatalogYear,
    selectedCatalogBody,
  ]);

  const loadCatalogMakesList = useCallback(async () => {
    try {
      const res = await fetchCatalogMakes();
      if (!res.error) {
        setCatalogMakes(res.data);
        setCatalogMakeDetails(res.details || []);
      }
    } catch {
      // Ignora errori minori non bloccanti
    }
  }, []);

  useEffect(() => {
    if (!selectedCatalogMake) {
      setCatalogModels([]);
      setSelectedCatalogModel('');
      return;
    }
    fetchCatalogModels(selectedCatalogMake).then((res) => {
      if (!res.error) {
        setCatalogModels(res.data);
      } else {
        setCatalogModels([]);
      }
    });
  }, [selectedCatalogMake]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadCatalogData();
      if (catalogMakes.length === 0) {
        loadCatalogMakesList();
      }
    }
  }, [activeTab, loadCatalogData, loadCatalogMakesList, catalogMakes.length]);

  const handleRefreshCatalogCache = async () => {
    setIsRefreshingCache(true);
    setCacheMessage(null);
    try {
      clearCatalogCache();
      const countRes = await fetchCatalogTotalCount(true);
      const makesRes = await fetchCatalogMakes({ forceRefresh: true });
      if (!makesRes.error) {
        setCatalogMakes(makesRes.data);
        setCatalogMakeDetails(makesRes.details || []);
      }
      await loadCatalogData();
      setCacheMessage(
        `Catalogo aggiornato: ${countRes.count.toLocaleString('it-IT')} configurazioni sincronizzate.`
      );
      setTimeout(() => setCacheMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore aggiornamento catalogo';
      setCatalogError(msg);
    } finally {
      setIsRefreshingCache(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setFuelFilter('all');
    setYearFilter('');
    setCurrentPage(1);
  };

  const handleResetCatalogFilters = () => {
    setCatalogSearch('');
    setCatalogDebouncedSearch('');
    setSelectedCatalogMake('');
    setSelectedCatalogModel('');
    setSelectedCatalogFuel('all');
    setSelectedCatalogYear('');
    setSelectedCatalogBody('all');
    setCatalogPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || statusFilter !== 'all' || fuelFilter !== 'all' || yearFilter
  );

  const hasActiveCatalogFilters = Boolean(
    catalogDebouncedSearch ||
      selectedCatalogMake ||
      selectedCatalogModel ||
      selectedCatalogFuel !== 'all' ||
      selectedCatalogYear ||
      selectedCatalogBody !== 'all'
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const totalCatalogPages = Math.max(1, Math.ceil(catalogTotalCount / catalogPageSize));

  const getStatusBadge = (statusValue: string) => {
    const found = VEHICLE_STATUS_OPTIONS.find((s) => s.value === statusValue);
    if (found) {
      return (
        <span
          className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${found.color}`}
        >
          {found.label}
        </span>
      );
    }
    return <StatusBadge tone="neutral">{statusValue || 'Non specificato'}</StatusBadge>;
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-5 font-sans select-none">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A2322] tracking-tight">
            Veicoli Demoliti
          </h1>
          <p className="text-xs text-[#5C6B68] mt-0.5">
            Parco veicoli di <strong className="text-[#1A2322]">{currentSeller?.business_name || 'Autodemolitore'}</strong> e catalogo modelli Autopia
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'catalog' && (
            <Button
              variant="secondary"
              size="sm"
              loading={isRefreshingCache}
              onClick={handleRefreshCatalogCache}
              disabled={isRefreshingCache || isCatalogLoading}
              title="Aggiorna il catalogo centrale"
            >
              {!isRefreshingCache && <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isRefreshingCache ? 'Sincronizzazione...' : 'Aggiorna catalogo'}</span>
            </Button>
          )}

          {activeTab === 'yard' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadVehicles()}
                disabled={isLoading}
                title="Aggiorna elenco"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#074E44]' : ''}`} />
                <span className="hidden sm:inline">Aggiorna</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setVehicleToEdit(null);
                  setCatalogVehicleToRegister(null);
                  setIsFormModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi veicolo</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {cacheMessage && (
        <AlertBanner tone="success" onDismiss={() => setCacheMessage(null)}>
          {cacheMessage}
        </AlertBanner>
      )}

      {/* 2. Switcher Schede */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#E9EFEE] rounded-xl self-start">
        <button
          type="button"
          onClick={() => setActiveTab('yard')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'yard'
              ? 'bg-white text-[#074E44] shadow-xs'
              : 'text-[#5C6B68] hover:text-[#1A2322]'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Parco veicoli</span>
          <span className="font-mono tabular-nums text-[11px] opacity-80">({totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-white text-[#074E44] shadow-xs'
              : 'text-[#5C6B68] hover:text-[#1A2322]'
          }`}
        >
          <DatabaseIcon className="w-3.5 h-3.5" />
          <span>Catalogo modelli</span>
          <span className="font-mono tabular-nums text-[11px] opacity-80">
            ({catalogTotalCount.toLocaleString('it-IT')})
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PARCO VEICOLI DEMOLITI                                  */}
      {/* ============================================================== */}
      {activeTab === 'yard' && (
        <div className="space-y-4">
          <div className={`${uiClasses.card} p-3.5`}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7B8B88]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Cerca per marca, modello, targa, VIN o versione..."
                  className={`${uiClasses.input} pl-9 pr-8`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7B8B88] hover:text-[#1A2322] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={uiClasses.select}
                >
                  <option value="all">Tutti gli stati</option>
                  {VEHICLE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={fuelFilter}
                  onChange={(e) => {
                    setFuelFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={uiClasses.select}
                >
                  <option value="all">Alimentazione</option>
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Anno"
                  min="1950"
                  max="2030"
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`${uiClasses.input} tabular-nums`}
                />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters} className="px-2.5">
                    Azzera
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className={`${uiClasses.tableWrapper} flex flex-col`}>
            {fetchError && (
              <div className="p-4">
                <AlertBanner
                  tone="danger"
                  title="Impossibile caricare i veicoli"
                  action={
                    <Button size="xs" variant="secondary" onClick={() => loadVehicles()}>
                      Riprova
                    </Button>
                  }
                >
                  {fetchError}
                </AlertBanner>
              </div>
            )}

            {isLoading && <LoadingState message="Caricamento parco veicoli..." />}

            {!isLoading && !fetchError && vehicles.length === 0 && !hasActiveFilters && (
              <div className="p-6">
                <EmptyState
                  icon={<Car className="w-5 h-5" />}
                  title="Nessun veicolo registrato"
                  description="Aggiungi il primo veicolo nel tuo parco auto oppure seleziona un modello dal catalogo centrale Autopia."
                  action={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setVehicleToEdit(null);
                          setCatalogVehicleToRegister(null);
                          setIsFormModalOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Registra veicolo</span>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('catalog')}>
                        <DatabaseIcon className="w-3.5 h-3.5" />
                        <span>Esplora catalogo</span>
                      </Button>
                    </div>
                  }
                />
              </div>
            )}

            {!isLoading && !fetchError && vehicles.length === 0 && hasActiveFilters && (
              <div className="p-6">
                <EmptyState
                  icon={<Search className="w-5 h-5" />}
                  title="Nessun veicolo trovato"
                  description="Nessun veicolo corrisponde ai filtri selezionati."
                  action={
                    <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                      Azzera filtri
                    </Button>
                  }
                />
              </div>
            )}

            {!isLoading && !fetchError && vehicles.length > 0 && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={uiClasses.tableHeadRow}>
                      <th className="py-3 px-4">Targa / VIN</th>
                      <th className="py-3 px-4">Marca e Modello</th>
                      <th className="py-3 px-4">Anno / Versione</th>
                      <th className="py-3 px-4">Motore / Alim.</th>
                      <th className="py-3 px-4">Stato</th>
                      <th className="py-3 px-4">Posizione</th>
                      <th className="py-3 px-4">Ingresso</th>
                      <th className="py-3 px-4 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F1]">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-[#F7FAF9] transition-colors">
                        <td className="py-3 px-4 font-mono">
                          {v.plate ? (
                            <span className="px-2 py-0.5 rounded-md bg-[#F3F6F5] border border-[#D7E0DE] text-[#1A2322] font-bold tracking-wider">
                              {v.plate}
                            </span>
                          ) : (
                            <span className="text-[#7B8B88] italic font-sans">Senza targa</span>
                          )}
                          {v.vin && (
                            <span className="block text-[10px] text-[#748481] mt-1 truncate max-w-[140px]" title={v.vin}>
                              {v.vin}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1A2322]">
                            {v.make} {v.model}
                          </div>
                          {v.generation && (
                            <div className="text-[11px] text-[#5C6B68]">Serie {v.generation}</div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1A2322] tabular-nums">
                            {v.year || '—'}
                          </div>
                          <div className="text-[11px] text-[#5C6B68] truncate max-w-[150px]" title={v.version || ''}>
                            {v.version || 'Base'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-[#1A2322] font-mono text-[11px]">
                            {v.engine || '—'}
                          </div>
                          <div className="text-[11px] text-[#5C6B68]">{v.fuel_type || '—'}</div>
                        </td>

                        <td className="py-3 px-4">{getStatusBadge(v.status)}</td>

                        <td className="py-3 px-4 text-[#374845]">
                          {v.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#074E44] shrink-0" />
                              <span>{v.location}</span>
                            </span>
                          ) : (
                            <span className="text-[#93A3A0]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[#5C6B68] font-mono tabular-nums text-[11px]">
                          {v.arrival_date || '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExtractorVehicle(v)}
                              title="Recupera e carica ricambi da questo veicolo"
                              className="px-2.5 py-1.5 bg-[#EAF3F1] hover:bg-[#DCECE9] border border-[#C6DFDA] text-[#074E44] rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span className="hidden sm:inline">Recupera ricambi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedVehicleForDetails(v)}
                              title="Visualizza scheda"
                              className="p-1.5 hover:bg-[#EDF2F1] text-[#5C6B68] hover:text-[#1A2322] rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVehicleToEdit(v);
                                setCatalogVehicleToRegister(null);
                                setIsFormModalOpen(true);
                              }}
                              title="Modifica veicolo"
                              className="p-1.5 hover:bg-[#EAF3F1] text-[#074E44] rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setVehicleToDelete(v)}
                              title="Elimina veicolo"
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && !fetchError && totalCount > 0 && (
              <div className="px-4 py-2.5 bg-[#FAFBFB] border-t border-[#E2E8E7] flex items-center justify-between text-xs text-[#5C6B68] shrink-0">
                <div className="tabular-nums">
                  Visualizzati{' '}
                  <strong className="text-[#1A2322]">
                    {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}–{Math.min(totalCount, currentPage * pageSize)}
                  </strong>{' '}
                  di <strong className="text-[#1A2322]">{totalCount}</strong> veicoli
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 bg-white border border-[#D7E0DE] hover:bg-[#F3F6F5] text-[#1A2322] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-mono tabular-nums text-[#1A2322] px-1">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 bg-white border border-[#D7E0DE] hover:bg-[#F3F6F5] text-[#1A2322] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CATALOGO MODELLI AUTOPIA                                */}
      {/* ============================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className={`${uiClasses.card} p-3.5 space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F1]">
              <div className="flex items-center gap-2 text-xs">
                <DatabaseIcon className="w-4 h-4 text-[#074E44]" />
                <span className="font-bold text-[#1A2322]">Catalogo Modelli Autopia</span>
                <span className="text-[#C5D0CE]">·</span>
                <span className="text-[#5C6B68] tabular-nums">
                  {catalogTotalCount.toLocaleString('it-IT')} configurazioni disponibili
                </span>
              </div>

              {hasActiveCatalogFilters && (
                <Button variant="ghost" size="xs" onClick={handleResetCatalogFilters}>
                  Azzera filtri
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-[#7B8B88] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => handleCatalogSearchChange(e.target.value)}
                  placeholder="Cerca marca, modello, motore o versione..."
                  className={`${uiClasses.input} pl-9 pr-8`}
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => handleCatalogSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7B8B88] hover:text-[#1A2322] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedCatalogMake}
                  onChange={(e) => {
                    setSelectedCatalogMake(e.target.value);
                    setSelectedCatalogModel('');
                    setCatalogPage(1);
                  }}
                  className={uiClasses.select}
                >
                  <option value="">Tutte le marche ({catalogMakes.length || '45'})</option>
                  {catalogMakes.map((m) => {
                    const d = catalogMakeDetails.find((item) => item.name === m);
                    return (
                      <option key={m} value={m}>
                        {m} {d ? `(${d.count})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedCatalogModel}
                  onChange={(e) => {
                    setSelectedCatalogModel(e.target.value);
                    setCatalogPage(1);
                  }}
                  disabled={!selectedCatalogMake}
                  className={uiClasses.select}
                >
                  <option value="">
                    {!selectedCatalogMake
                      ? 'Seleziona prima una marca'
                      : `Tutti i modelli (${catalogModels.length})`}
                  </option>
                  {catalogModels.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedCatalogFuel}
                  onChange={(e) => {
                    setSelectedCatalogFuel(e.target.value);
                    setCatalogPage(1);
                  }}
                  className={uiClasses.select}
                >
                  <option value="all">Alimentazione</option>
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={`${uiClasses.tableWrapper} flex flex-col`}>
            {catalogError && (
              <div className="p-4">
                <AlertBanner
                  tone="danger"
                  title="Errore lettura catalogo"
                  action={
                    <Button size="xs" variant="secondary" onClick={() => loadCatalogData()}>
                      Riprova
                    </Button>
                  }
                >
                  {catalogError}
                </AlertBanner>
              </div>
            )}

            {isCatalogLoading && <LoadingState message="Ricerca nel catalogo modelli..." />}

            {!isCatalogLoading && !catalogError && catalogVehicles.length === 0 && (
              <div className="p-6">
                <EmptyState
                  icon={<DatabaseIcon className="w-5 h-5" />}
                  title="Nessun modello trovato"
                  description="Nessuna configurazione corrisponde ai filtri impostati."
                  action={
                    hasActiveCatalogFilters ? (
                      <Button variant="secondary" size="sm" onClick={handleResetCatalogFilters}>
                        Azzera filtri
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}

            {!isCatalogLoading && !catalogError && catalogVehicles.length > 0 && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={uiClasses.tableHeadRow}>
                      <th className="py-3 px-4">Marca e Modello</th>
                      <th className="py-3 px-4">Serie / Generazione</th>
                      <th className="py-3 px-4">Versione / Allestimento</th>
                      <th className="py-3 px-4">Anni Produzione</th>
                      <th className="py-3 px-4">Motore / Potenza</th>
                      <th className="py-3 px-4">Alimentazione</th>
                      <th className="py-3 px-4 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F1]">
                    {catalogVehicles.map((cv) => (
                      <tr key={cv.id} className="hover:bg-[#F7FAF9] transition-colors group">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1A2322]">
                            {cv.make} {cv.model}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[#374845]">
                          {cv.generation ? (
                            <span className="px-2 py-0.5 rounded-md bg-[#F3F6F5] border border-[#D7E0DE] font-mono text-[11px] text-[#1A2322]">
                              {cv.generation}
                            </span>
                          ) : (
                            <span className="text-[#93A3A0]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1A2322]">{cv.version || 'Base'}</div>
                          {cv.body_style && (
                            <div className="text-[11px] text-[#5C6B68]">{cv.body_style}</div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono tabular-nums text-[11px] text-[#374845]">
                          {cv.year_from || '—'} – {cv.year_to || 'in corso'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-[#1A2322] font-mono font-medium">
                            {cv.engine || '—'}
                          </div>
                          {cv.power && <div className="text-[11px] text-[#5C6B68]">{cv.power}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-[#074E44] font-semibold text-[11px]">
                            {cv.fuel_type || 'Standard'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setVehicleToEdit(null);
                              setCatalogVehicleToRegister(cv);
                              setIsFormModalOpen(true);
                            }}
                            className="group-hover:bg-[#074E44] group-hover:text-white group-hover:border-[#074E44]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registra veicolo</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isCatalogLoading && !catalogError && catalogTotalCount > 0 && (
              <div className="px-4 py-2.5 bg-[#FAFBFB] border-t border-[#E2E8E7] flex items-center justify-between text-xs text-[#5C6B68] shrink-0">
                <div className="tabular-nums">
                  Visualizzati{' '}
                  <strong className="text-[#1A2322]">
                    {Math.min(catalogTotalCount, (catalogPage - 1) * catalogPageSize + 1)}–
                    {Math.min(catalogTotalCount, catalogPage * catalogPageSize)}
                  </strong>{' '}
                  di <strong className="text-[#1A2322]">{catalogTotalCount.toLocaleString('it-IT')}</strong> modelli
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                    disabled={catalogPage <= 1}
                    className="p-1.5 bg-white border border-[#D7E0DE] hover:bg-[#F3F6F5] text-[#1A2322] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-mono tabular-nums text-[#1A2322] px-1">
                    {catalogPage} / {totalCatalogPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                    disabled={catalogPage >= totalCatalogPages}
                    className="p-1.5 bg-white border border-[#D7E0DE] hover:bg-[#F3F6F5] text-[#1A2322] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modali */}
      {sellerId && (
        <VehicleFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setVehicleToEdit(null);
            setCatalogVehicleToRegister(null);
          }}
          onSuccess={(savedVehicle, andOpenPartsExtractor) => {
            loadVehicles();
            setActiveTab('yard');
            if (andOpenPartsExtractor) {
              setExtractorVehicle(savedVehicle);
            }
          }}
          sellerId={sellerId}
          vehicleToEdit={vehicleToEdit}
          initialCatalogVehicle={catalogVehicleToRegister}
        />
      )}

      <VehicleDetailsModal
        vehicle={selectedVehicleForDetails}
        onClose={() => setSelectedVehicleForDetails(null)}
        onEdit={(v) => {
          setVehicleToEdit(v);
          setCatalogVehicleToRegister(null);
          setIsFormModalOpen(true);
        }}
        onDelete={(v) => {
          setSelectedVehicleForDetails(null);
          setVehicleToDelete(v);
        }}
        onExtractParts={(v) => {
          setExtractorVehicle(v);
        }}
      />

      {sellerId && extractorVehicle && (
        <VehiclePartsExtractorModal
          isOpen={Boolean(extractorVehicle)}
          onClose={() => setExtractorVehicle(null)}
          vehicle={extractorVehicle}
          sellerId={sellerId}
          onComplete={() => {
            loadVehicles();
          }}
        />
      )}

      {sellerId && (
        <DeleteVehicleModal
          vehicle={vehicleToDelete}
          sellerId={sellerId}
          isOpen={Boolean(vehicleToDelete)}
          onClose={() => setVehicleToDelete(null)}
          onSuccess={() => {
            loadVehicles();
          }}
        />
      )}
    </div>
  );
};
