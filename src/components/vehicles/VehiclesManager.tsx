import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  X,
  Fuel,
  Database as DatabaseIcon,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowUpDown,
  BookOpen,
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
  BODY_STYLE_OPTIONS,
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
import { useAuth } from '../../contexts/AuthContext';

export const VehiclesManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const currentSeller = effectiveSellerProfile || sellerProfile;
  const sellerId = currentSeller?.id;

  // Tab di navigazione principale: 'yard' (Piazzale demolitore) | 'catalog' (Banca dati centrale 11.346)
  const [activeTab, setActiveTab] = useState<'yard' | 'catalog'>('yard');

  // ==========================================
  // STATO TAB 1: PARCO VEICOLI DEMOLITORE (seller_vehicles)
  // ==========================================
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

  // ==========================================
  // STATO TAB 2: CATALOGO CENTRALE AUTOPIA (public.vehicles)
  // ==========================================
  const [catalogVehicles, setCatalogVehicles] = useState<CatalogVehicle[]>([]);
  const [catalogTotalCount, setCatalogTotalCount] = useState<number>(11346);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const catalogPageSize = 15;

  // Filtri Catalogo Centrale
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

  // ==========================================
  // STATO MODALI
  // ==========================================
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<SellerVehicle | null>(null);
  const [catalogVehicleToRegister, setCatalogVehicleToRegister] = useState<CatalogVehicle | null>(null);

  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState<SellerVehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<SellerVehicle | null>(null);

  // Debounce per ricerca piazzale (350ms)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 350);
  };

  // Debounce per ricerca catalogo centrale (350ms)
  const catalogDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleCatalogSearchChange = (val: string) => {
    setCatalogSearch(val);
    if (catalogDebounceRef.current) clearTimeout(catalogDebounceRef.current);
    catalogDebounceRef.current = setTimeout(() => {
      setCatalogDebouncedSearch(val);
      setCatalogPage(1);
    }, 350);
  };

  // 1. Caricamento Veicoli Piazzale Demolitore
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

  // 2. Caricamento Dati Catalogo Centrale
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

  // Caricamento marche del catalogo
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

  // Aggiornamento modelli quando cambia la marca selezionata nel catalogo
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

  // Refresh manuale cache catalogo
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
        `Cache aggiornata con successo! ${countRes.count.toLocaleString('it-IT')} veicoli sincronizzati dal database Supabase.`
      );
      setTimeout(() => setCacheMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore aggiornamento cache';
      setCatalogError(msg);
    } finally {
      setIsRefreshingCache(false);
    }
  };

  // Gestione Reset Filtri Piazzale
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setFuelFilter('all');
    setYearFilter('');
    setCurrentPage(1);
  };

  // Gestione Reset Filtri Catalogo
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
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${found.color}`}>
          {found.label}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700 uppercase">
        {statusValue || 'Non specificato'}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-4 font-sans select-none">
      {/* 1. Header con Tab Switcher e Azioni Principali */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <Car className="w-5 h-5 text-amber-400" />
              <span>Gestione Veicoli</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-amber-400 font-semibold">
              Banca Dati Supabase: 11.346 veicoli
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro ingressi, bonifiche e catalogo centralizzato di{' '}
            <strong className="text-slate-200">{sellerProfile?.business_name || 'Autodemolitore'}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'catalog' && (
            <button
              type="button"
              onClick={handleRefreshCatalogCache}
              disabled={isRefreshingCache || isCatalogLoading}
              title="Svuota cache in-memory e risincronizza dal database Supabase"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCache ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isRefreshingCache ? 'Sincronizzazione...' : 'Svuota Cache & Ricarica Live'}</span>
            </button>
          )}

          {activeTab === 'yard' && (
            <>
              <button
                type="button"
                onClick={() => loadVehicles()}
                disabled={isLoading}
                title="Aggiorna elenco piazzale"
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setVehicleToEdit(null);
                  setCatalogVehicleToRegister(null);
                  setIsFormModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi Veicolo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifica feedback aggiornamento cache */}
      {cacheMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-xs text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cacheMessage}</span>
        </div>
      )}

      {/* 2. TAB SELECTOR */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('yard')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'yard'
              ? 'border-amber-400 bg-slate-900 text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Parco Veicoli Demoliti</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'catalog'
              ? 'border-amber-400 bg-slate-900 text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <DatabaseIcon className="w-4 h-4 text-amber-400" />
          <span>Banca Dati Catalogo Centrale</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">
            11.346 veicoli
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VISTA TAB 1: PARCO VEICOLI DEMOLITI (seller_vehicles) */}
      {/* ============================================================== */}
      {activeTab === 'yard' && (
        <div className="space-y-4">
          {/* Barra Filtri Piazzale */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Cerca per marca, modello, targa, VIN o versione..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Tutti gli stati demolizione...</option>
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
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Alimentazione...</option>
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center space-x-1.5">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Azzera tutti i filtri"
                    className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Azzera
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabella Veicoli Piazzale */}
          <div className="min-h-0 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
            {fetchError && (
              <div className="m-4 p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-200 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Errore durante la comunicazione con il database</div>
                  <div className="mt-0.5">{fetchError}</div>
                  <button
                    type="button"
                    onClick={() => loadVehicles()}
                    className="mt-2 text-amber-400 hover:underline font-semibold"
                  >
                    Riprova a caricare i dati
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                <span className="text-xs">Caricamento parco veicoli in corso...</span>
              </div>
            )}

            {!isLoading && !fetchError && vehicles.length === 0 && !hasActiveFilters && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Nessun veicolo demolito registrato</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Non hai ancora registrato veicoli nel tuo parco auto. Puoi aggiungerne uno manualmente o selezionarlo dalla banca dati del catalogo centrale Autopia.
                  </p>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleToEdit(null);
                      setCatalogVehicleToRegister(null);
                      setIsFormModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registra Nuovo Veicolo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <DatabaseIcon className="w-4 h-4 text-amber-400" />
                    <span>Esplora Catalogo (11.346)</span>
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !fetchError && vehicles.length === 0 && hasActiveFilters && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Nessun veicolo trovato</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Nessun veicolo corrisponde ai criteri di ricerca impostati nel piazzale.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Azzera Filtri
                </button>
              </div>
            )}

            {!isLoading && !fetchError && vehicles.length > 0 && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Targa / VIN</th>
                      <th className="py-2.5 px-3">Marca e Modello</th>
                      <th className="py-2.5 px-3">Anno / Versione</th>
                      <th className="py-2.5 px-3">Motore / Alim.</th>
                      <th className="py-2.5 px-3">Stato</th>
                      <th className="py-2.5 px-3">Posizione</th>
                      <th className="py-2.5 px-3">Ingresso</th>
                      <th className="py-2.5 px-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium">
                          {v.plate ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-100 font-bold tracking-wider">
                              {v.plate}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Senza targa</span>
                          )}
                          {v.vin && (
                            <span className="block text-[10px] text-slate-500 truncate max-w-[130px]" title={v.vin}>
                              {v.vin}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-100 text-xs">
                            {v.make} {v.model}
                          </div>
                          {v.generation && (
                            <div className="text-[10px] text-slate-400">
                              Serie: {v.generation}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200">
                            {v.year || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={v.version || ''}>
                            {v.version || 'Base'}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="text-slate-200 font-mono text-[11px]">
                            {v.engine || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {v.fuel_type || '—'}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          {getStatusBadge(v.status)}
                        </td>

                        <td className="py-2.5 px-3 text-slate-300">
                          {v.location ? (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{v.location}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {v.arrival_date || '—'}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => setSelectedVehicleForDetails(v)}
                              title="Visualizza dettagli"
                              className="p-1 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVehicleToEdit(v);
                                setCatalogVehicleToRegister(null);
                                setIsFormModalOpen(true);
                              }}
                              title="Modifica veicolo"
                              className="p-1 hover:bg-slate-700 text-amber-400 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setVehicleToDelete(v)}
                              title="Elimina veicolo"
                              className="p-1 hover:bg-red-950/60 text-red-400 rounded transition-colors cursor-pointer"
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

            {/* Paginazione Piazzale */}
            {!isLoading && !fetchError && totalCount > 0 && (
              <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <div>
                  Visualizzati{' '}
                  <span className="text-slate-200 font-semibold">
                    {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} -{' '}
                    {Math.min(totalCount, currentPage * pageSize)}
                  </span>{' '}
                  di <span className="text-slate-200 font-semibold">{totalCount}</span> veicoli registrati
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-mono text-slate-300 px-1">
                    Pagina {currentPage} di {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
      {/* VISTA TAB 2: BANCA DATI CATALOGO CENTRALE AUTOPIA (11.346) */}
      {/* ============================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Barra Filtri Catalogo Centrale */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs">
                <DatabaseIcon className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  Banca Dati Ufficiale public.vehicles
                </span>
                <span className="text-slate-500 font-mono">•</span>
                <span className="text-slate-400">
                  Tutti i veicoli sincronizzati dal database ({catalogTotalCount.toLocaleString('it-IT')} totali)
                </span>
              </div>

              {hasActiveCatalogFilters && (
                <button
                  type="button"
                  onClick={handleResetCatalogFilters}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors cursor-pointer"
                >
                  Azzera Filtri
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              {/* Ricerca Testuale Multi-Parola */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => handleCatalogSearchChange(e.target.value)}
                  placeholder="Cerca veicolo, motore, versione o anno..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => handleCatalogSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro Marca (45 marche deduplicate) */}
              <div className="md:col-span-3">
                <select
                  value={selectedCatalogMake}
                  onChange={(e) => {
                    setSelectedCatalogMake(e.target.value);
                    setSelectedCatalogModel('');
                    setCatalogPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Tutte le marche ({catalogMakes.length || '45'})...</option>
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

              {/* Filtro Modello Dipendente dalla Marca */}
              <div className="md:col-span-3">
                <select
                  value={selectedCatalogModel}
                  onChange={(e) => {
                    setSelectedCatalogModel(e.target.value);
                    setCatalogPage(1);
                  }}
                  disabled={!selectedCatalogMake}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!selectedCatalogMake
                      ? 'Prima seleziona una marca...'
                      : `Tutti i modelli (${catalogModels.length})...`}
                  </option>
                  {catalogModels.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Alimentazione */}
              <div className="md:col-span-2">
                <select
                  value={selectedCatalogFuel}
                  onChange={(e) => {
                    setSelectedCatalogFuel(e.target.value);
                    setCatalogPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Alimentazione...</option>
                  {FUEL_TYPE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabella o Card Catalogo Centrale */}
          <div className="min-h-0 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
            {catalogError && (
              <div className="m-4 p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-200 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Errore lettura catalogo centrale</div>
                  <div className="mt-0.5">{catalogError}</div>
                  <button
                    type="button"
                    onClick={() => loadCatalogData()}
                    className="mt-2 text-amber-400 hover:underline font-semibold"
                  >
                    Riprova query
                  </button>
                </div>
              </div>
            )}

            {isCatalogLoading && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                <span className="text-xs">Interrogazione catalogo centrale Supabase in corso...</span>
              </div>
            )}

            {!isCatalogLoading && !catalogError && catalogVehicles.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                  <DatabaseIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Nessun veicolo trovato nel catalogo</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Nessuna variante corrisponde ai filtri selezionati. Prova a rimuovere alcuni filtri.
                  </p>
                </div>
                {hasActiveCatalogFilters && (
                  <button
                    type="button"
                    onClick={handleResetCatalogFilters}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Azzera Filtri Catalogo
                  </button>
                )}
              </div>
            )}

            {!isCatalogLoading && !catalogError && catalogVehicles.length > 0 && (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Marca e Modello</th>
                      <th className="py-2.5 px-3">Serie / Generazione</th>
                      <th className="py-2.5 px-3">Versione / Allestimento</th>
                      <th className="py-2.5 px-3">Anni Produzione</th>
                      <th className="py-2.5 px-3">Motore / Potenza</th>
                      <th className="py-2.5 px-3">Alimentazione</th>
                      <th className="py-2.5 px-3 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {catalogVehicles.map((cv) => (
                      <tr key={cv.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-100 text-xs">
                            {cv.make} {cv.model}
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 truncate block max-w-[180px]" title={cv.id}>
                            ID: {cv.id.slice(0, 8)}...
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-300">
                          {cv.generation ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
                              {cv.generation}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200">
                            {cv.version || 'Base'}
                          </div>
                          {cv.body_style && (
                            <div className="text-[10px] text-slate-500">
                              {cv.body_style}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {cv.year_from || '—'} – {cv.year_to || 'in corso'}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="text-slate-200 font-mono font-medium">
                            {cv.engine || '—'}
                          </div>
                          {cv.power && (
                            <div className="text-[10px] text-slate-400">
                              {cv.power}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-amber-400 font-medium text-[11px]">
                            {cv.fuel_type || 'Standard'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setVehicleToEdit(null);
                              setCatalogVehicleToRegister(cv);
                              setIsFormModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 font-semibold rounded text-[11px] transition-colors cursor-pointer flex items-center space-x-1 ml-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registra nel Piazzale</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginazione Catalogo Centrale */}
            {!isCatalogLoading && !catalogError && catalogTotalCount > 0 && (
              <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <div>
                  Visualizzati{' '}
                  <span className="text-slate-200 font-semibold">
                    {Math.min(catalogTotalCount, (catalogPage - 1) * catalogPageSize + 1)} -{' '}
                    {Math.min(catalogTotalCount, catalogPage * catalogPageSize)}
                  </span>{' '}
                  di <span className="text-slate-200 font-semibold">{catalogTotalCount.toLocaleString('it-IT')}</span> varianti catalogo
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                    disabled={catalogPage <= 1}
                    className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-mono text-slate-300 px-1">
                    Pagina {catalogPage} di {totalCatalogPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                    disabled={catalogPage >= totalCatalogPages}
                    className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale Registrazione / Modifica Veicolo */}
      {sellerId && (
        <VehicleFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setVehicleToEdit(null);
            setCatalogVehicleToRegister(null);
          }}
          onSuccess={() => {
            loadVehicles();
            setActiveTab('yard');
          }}
          sellerId={sellerId}
          vehicleToEdit={vehicleToEdit}
          initialCatalogVehicle={catalogVehicleToRegister}
        />
      )}

      {/* Modale Dettagli Scheda Veicolo */}
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
      />

      {/* Modale Eliminazione Sicura */}
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
