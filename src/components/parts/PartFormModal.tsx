import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Package,
  Car,
  Hash,
  DollarSign,
  Layers,
  MapPin,
  FileText,
  Loader2,
  Check,
  Search,
  Database as DatabaseIcon,
  Sparkles,
  ChevronRight,
  Save,
  CheckCircle2,
} from 'lucide-react';
import type { InventoryItem, PartCategory } from '../../types/inventory';
import type { SellerVehicle, CatalogVehicle, CatalogMakeInfo } from '../../types/vehicles';
import {
  createInventoryItem,
  updateInventoryItem,
  fetchPartCategories,
} from '../../services/partsService';
import {
  fetchSellerVehicles,
  searchCatalogVehicles,
  fetchCatalogMakes,
  fetchCatalogModels,
  fetchCatalogVariants,
  fetchCatalogVehicleById,
} from '../../services/vehiclesService';
import {
  generateSmartPartDescription,
  detectSideFromName,
} from '../../services/recommendedPartsService';
import { uiClasses, Button, AlertBanner } from '../ui/DesignSystem';

interface PartFormModalProps {
  sellerId: string;
  itemToEdit?: InventoryItem | null;
  initialSellerVehicleId?: string | null;
  onClose: () => void;
  onSuccess: (savedItem: InventoryItem) => void;
}

export const PartFormModal: React.FC<PartFormModalProps> = ({
  sellerId,
  itemToEdit,
  initialSellerVehicleId,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(itemToEdit);

  const [title, setTitle] = useState(itemToEdit?.title || '');
  const [oemCode, setOemCode] = useState(itemToEdit?.oem_code || '');
  const [internalCode, setInternalCode] = useState(itemToEdit?.internal_code || '');
  const [price, setPrice] = useState<string>(
    itemToEdit && itemToEdit.price !== undefined ? String(itemToEdit.price) : ''
  );
  const [quantity, setQuantity] = useState<string>(itemToEdit ? String(itemToEdit.quantity) : '1');
  const [condition, setCondition] = useState<InventoryItem['condition']>(
    itemToEdit?.condition || 'buono'
  );
  const [side, setSide] = useState(itemToEdit?.side || '');
  const [positionNote, setPositionNote] = useState(itemToEdit?.position_note || '');
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [internalNotes, setInternalNotes] = useState(itemToEdit?.internal_notes || '');
  const [pickupAvailable, setPickupAvailable] = useState(itemToEdit?.pickup_available ?? true);
  const [shippingAvailable, setShippingAvailable] = useState(itemToEdit?.shipping_available ?? true);
  const [shippingCost, setShippingCost] = useState<string>(
    itemToEdit?.shipping_cost !== undefined && itemToEdit.shipping_cost !== null
      ? String(itemToEdit.shipping_cost)
      : '12.00'
  );

  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [yardVehicles, setYardVehicles] = useState<SellerVehicle[]>([]);
  const [, setIsLoadingMeta] = useState(true);

  const [originType, setOriginType] = useState<'yard' | 'catalog'>('yard');
  const [selectedSellerVehicleId, setSelectedSellerVehicleId] = useState<string>(
    itemToEdit?.seller_vehicle_id || initialSellerVehicleId || ''
  );
  const [selectedCatalogVehicle, setSelectedCatalogVehicle] = useState<CatalogVehicle | null>(null);

  const [catalogSearchMode, setCatalogSearchMode] = useState<'quick' | 'cascade'>('quick');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogSearchResults, setCatalogSearchResults] = useState<CatalogVehicle[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogSearchError, setCatalogSearchError] = useState<string | null>(null);

  const [catalogMakes, setCatalogMakes] = useState<CatalogMakeInfo[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [catalogVariants, setCatalogVariants] = useState<CatalogVehicle[]>([]);
  const [isLoadingCascade, setIsLoadingCascade] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [catsRes, vehsRes] = await Promise.all([
          fetchPartCategories(),
          fetchSellerVehicles({
            sellerId,
            filters: {},
            page: 1,
            pageSize: 300,
          }),
        ]);

        if (isMounted) {
          if (catsRes.data) setCategories(catsRes.data);
          const yardList = vehsRes.data || [];
          setYardVehicles(yardList);

          if (yardList.length === 0) {
            setOriginType('catalog');
          } else if (itemToEdit?.source_vehicle_id && !itemToEdit.seller_vehicle_id) {
            setOriginType('catalog');
          }

          if (itemToEdit?.source_vehicle_id) {
            fetchCatalogVehicleById(itemToEdit.source_vehicle_id).then((res) => {
              if (isMounted && res.data) {
                setSelectedCatalogVehicle(res.data);
              }
            });
          }
        }
      } catch (e) {
        console.warn('Errore caricamento metadati form ricambio:', e);
      } finally {
        if (isMounted) setIsLoadingMeta(false);
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [sellerId, itemToEdit]);

  useEffect(() => {
    if (originType === 'catalog' && catalogMakes.length === 0) {
      fetchCatalogMakes().then((res) => {
        if (res.details) setCatalogMakes(res.details);
      });
    }
  }, [originType, catalogMakes.length]);

  const handleCatalogSearchChange = (term: string) => {
    setCatalogSearchTerm(term);
    setCatalogSearchError(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!term.trim() || term.trim().length < 2) {
      setCatalogSearchResults([]);
      setIsSearchingCatalog(false);
      return;
    }

    setIsSearchingCatalog(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchCatalogVehicles(term, 25);
        if (res.error) {
          setCatalogSearchError(res.error);
        } else {
          setCatalogSearchResults(res.data || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Errore ricerca catalogo';
        setCatalogSearchError(msg);
      } finally {
        setIsSearchingCatalog(false);
      }
    }, 300);
  };

  const handleMakeSelect = async (make: string) => {
    setSelectedMake(make);
    setSelectedModel('');
    setCatalogVariants([]);
    if (!make) return;

    setIsLoadingCascade(true);
    try {
      const res = await fetchCatalogModels(make);
      if (res.data) setCatalogModels(res.data);
    } finally {
      setIsLoadingCascade(false);
    }
  };

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    setCatalogVariants([]);
    if (!selectedMake || !model) return;

    setIsLoadingCascade(true);
    try {
      const res = await fetchCatalogVariants({ make: selectedMake, model });
      if (res.data) setCatalogVariants(res.data);
    } finally {
      setIsLoadingCascade(false);
    }
  };

  const handleSelectCatalogVehicle = (vehicle: CatalogVehicle) => {
    setSelectedCatalogVehicle(vehicle);

    if (!description.trim() && title.trim()) {
      const autoDesc = generateSmartPartDescription(title.trim(), {
        make: vehicle.make,
        model: vehicle.model,
        version: vehicle.version,
        engine: vehicle.engine,
        fuel_type: vehicle.fuel_type,
        year: vehicle.year_from || undefined,
      });
      setDescription(autoDesc);
    }

    if (!side && title.trim()) {
      const autoSide = detectSideFromName(title.trim());
      if (autoSide) setSide(autoSide);
    }
  };

  const handleGenerateSmartDescription = () => {
    let vehicleData: {
      make: string;
      model: string;
      version?: string | null;
      engine?: string | null;
      fuel_type?: string | null;
      year?: number | null;
    } | null = null;

    if (originType === 'catalog' && selectedCatalogVehicle) {
      vehicleData = {
        make: selectedCatalogVehicle.make,
        model: selectedCatalogVehicle.model,
        version: selectedCatalogVehicle.version,
        engine: selectedCatalogVehicle.engine,
        fuel_type: selectedCatalogVehicle.fuel_type,
        year: selectedCatalogVehicle.year_from || undefined,
      };
    } else if (originType === 'yard' && selectedSellerVehicleId) {
      const foundYard = yardVehicles.find((v) => v.id === selectedSellerVehicleId);
      if (foundYard) {
        vehicleData = {
          make: foundYard.make,
          model: foundYard.model,
          version: foundYard.version,
          engine: foundYard.engine,
          fuel_type: foundYard.fuel_type,
          year: foundYard.year || undefined,
        };
      }
    }

    const partName = title.trim() || 'Ricambio auto';
    const smartDesc = generateSmartPartDescription(partName, vehicleData || undefined);
    setDescription(smartDesc);

    if (!side) {
      const autoSide = detectSideFromName(partName);
      if (autoSide) setSide(autoSide);
    }
  };

  const executeSubmit = async (targetStatus: InventoryItem['status']) => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Inserisci il nome o la descrizione del ricambio');
      return;
    }

    if (originType === 'catalog' || yardVehicles.length === 0) {
      if (!selectedCatalogVehicle) {
        setErrorMessage(
          'Selezione obbligatoria del veicolo: scegli un veicolo dal catalogo ufficiale Autopia per associare la compatibilità.'
        );
        return;
      }
    } else if (originType === 'yard') {
      if (!selectedSellerVehicleId) {
        setErrorMessage(
          'Seleziona il veicolo di provenienza dal piazzale o passa a "Catalogo Generale".'
        );
        return;
      }
    }

    const numPrice = parseFloat(price);
    if (targetStatus === 'available') {
      if (isNaN(numPrice) || numPrice <= 0) {
        setErrorMessage('Per la pubblicazione online è obbligatorio specificare un prezzo maggiore di 0 €.');
        return;
      }
    } else {
      if (isNaN(numPrice) || numPrice < 0) {
        setErrorMessage('Inserisci un prezzo valido (es. 45.00 o 0 per bozza incompleta)');
        return;
      }
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty < 1) {
      setErrorMessage('La quantità deve essere di almeno 1 pezzo');
      return;
    }

    const numShipping = shippingAvailable ? parseFloat(shippingCost) || 0 : null;

    let finalSellerVehicleId: string | null = null;
    let finalSourceVehicleId: string | null = null;

    if (originType === 'catalog' && selectedCatalogVehicle) {
      finalSourceVehicleId = selectedCatalogVehicle.id;
      finalSellerVehicleId = null;
    } else if (originType === 'yard' && selectedSellerVehicleId) {
      finalSellerVehicleId = selectedSellerVehicleId;
      const foundYard = yardVehicles.find((v) => v.id === selectedSellerVehicleId);
      if (foundYard?.catalog_vehicle_id) {
        finalSourceVehicleId = foundYard.catalog_vehicle_id;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditing && itemToEdit) {
        const res = await updateInventoryItem(sellerId, itemToEdit.id, {
          title: title.trim(),
          oem_code: oemCode.trim() || null,
          internal_code: internalCode.trim() || null,
          price: isNaN(numPrice) ? 0 : numPrice,
          quantity: numQty,
          condition,
          side: side || null,
          position_note: positionNote.trim() || null,
          description: description.trim() || null,
          internal_notes: internalNotes.trim() || null,
          seller_vehicle_id: finalSellerVehicleId,
          source_vehicle_id: finalSourceVehicleId,
          pickup_available: pickupAvailable,
          shipping_available: shippingAvailable,
          shipping_cost: numShipping,
          status: targetStatus,
        });

        if (res.error || !res.data) {
          setErrorMessage(res.error || "Errore durante l'aggiornamento del ricambio");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
      } else {
        const res = await createInventoryItem(sellerId, {
          title: title.trim(),
          category_id: categoryId || null,
          oem_code: oemCode.trim() || null,
          internal_code: internalCode.trim() || null,
          price: isNaN(numPrice) ? 0 : numPrice,
          quantity: numQty,
          condition,
          side: side || null,
          position_note: positionNote.trim() || null,
          description: description.trim() || null,
          internal_notes: internalNotes.trim() || null,
          seller_vehicle_id: finalSellerVehicleId,
          source_vehicle_id: finalSourceVehicleId,
          pickup_available: pickupAvailable,
          shipping_available: shippingAvailable,
          shipping_cost: numShipping,
          status: targetStatus,
        });

        if (res.error || !res.data) {
          setErrorMessage(res.error || 'Errore durante la creazione del ricambio');
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eccezione salvataggio';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E2E8E7] rounded-2xl w-full max-w-3xl my-6 overflow-hidden shadow-2xl flex flex-col text-[#1A2322] font-sans">
        {/* Intestazione */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEF2F1] bg-[#FAFBFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF3F1] border border-[#C6DFDA] text-[#074E44] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#162220]">
                {isEditing ? 'Modifica Scheda Ricambio' : 'Aggiungi Nuovo Ricambio'}
              </h2>
              <p className="text-xs text-[#5C6B68]">
                {isEditing
                  ? `Codice interno scheda: ${itemToEdit?.id.slice(0, 8)}`
                  : 'Crea una bozza o pubblica direttamente associando il veicolo di provenienza'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B68] hover:text-[#1A2322] hover:bg-[#EDF2F1] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {errorMessage && <AlertBanner tone="danger">{errorMessage}</AlertBanner>}

          {/* SEZIONE 1: ORIGINE VEICOLO */}
          <div className="space-y-3 bg-[#FAFBFB] border border-[#E2E8E7] rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#074E44] uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4" />
                <span>1. Veicolo di Provenienza & Compatibilità</span>
              </div>

              {yardVehicles.length > 0 && (
                <div className="inline-flex rounded-lg p-0.5 bg-[#EDF2F1] border border-[#D7E0DE] text-xs">
                  <button
                    type="button"
                    onClick={() => setOriginType('yard')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      originType === 'yard'
                        ? 'bg-[#074E44] text-white'
                        : 'text-[#5C6B68] hover:text-[#1A2322]'
                    }`}
                  >
                    Parco Auto ({yardVehicles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginType('catalog')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      originType === 'catalog'
                        ? 'bg-[#074E44] text-white'
                        : 'text-[#5C6B68] hover:text-[#1A2322]'
                    }`}
                  >
                    <DatabaseIcon className="w-3 h-3" />
                    <span>Catalogo Generale</span>
                  </button>
                </div>
              )}
            </div>

            {yardVehicles.length === 0 && (
              <AlertBanner tone="info" title="Nessun veicolo presente nel piazzale">
                Non hai veicoli registrati nel parco auto. Associa il ricambio selezionando il veicolo dal catalogo centrale Autopia.
              </AlertBanner>
            )}

            {originType === 'yard' && yardVehicles.length > 0 && (
              <div className="space-y-2">
                <label className={uiClasses.label}>Seleziona Veicolo nel Piazzale</label>
                <select
                  value={selectedSellerVehicleId}
                  onChange={(e) => setSelectedSellerVehicleId(e.target.value)}
                  className={uiClasses.select}
                >
                  <option value="">-- Seleziona un veicolo dal piazzale --</option>
                  {yardVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate ? `[Targa: ${v.plate}] ` : ''}
                      {v.make} {v.model} {v.generation ? `(${v.generation})` : ''} - {v.engine || ''}{' '}
                      {v.fuel_type || ''} {v.year ? `Anno ${v.year}` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C6B68]">
                  <span>Il ricambio erediterà targa, telaio e compatibilità del veicolo.</span>
                  <button
                    type="button"
                    onClick={() => setOriginType('catalog')}
                    className="text-[#074E44] hover:underline cursor-pointer font-semibold"
                  >
                    Non è nel piazzale? Cerca nel Catalogo Generale →
                  </button>
                </div>
              </div>
            )}

            {originType === 'catalog' && (
              <div className="space-y-3">
                {selectedCatalogVehicle ? (
                  <div className="p-3 bg-white border border-[#C6DFDA] rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#EAF3F1] border border-[#C6DFDA] flex items-center justify-center text-[#074E44] shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1A2322] flex items-center gap-2">
                          <span className="truncate">
                            {selectedCatalogVehicle.make} {selectedCatalogVehicle.model}
                          </span>
                          {selectedCatalogVehicle.generation && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#EAF3F1] rounded text-[#074E44] font-semibold shrink-0">
                              {selectedCatalogVehicle.generation}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5C6B68] mt-0.5 truncate">
                          {selectedCatalogVehicle.version || 'Standard'} •{' '}
                          {selectedCatalogVehicle.engine || '—'} •{' '}
                          {selectedCatalogVehicle.fuel_type || '—'} • Anni:{' '}
                          {selectedCatalogVehicle.year_from || '—'} –{' '}
                          {selectedCatalogVehicle.year_to || 'oggi'}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setSelectedCatalogVehicle(null)}
                    >
                      Cambia Veicolo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#2E3C3A]">
                        Cerca veicolo nel catalogo generale (11.346 modelli)
                      </span>
                      <div className="inline-flex rounded-lg p-0.5 bg-[#EDF2F1] border border-[#D7E0DE] text-[11px]">
                        <button
                          type="button"
                          onClick={() => setCatalogSearchMode('quick')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                            catalogSearchMode === 'quick'
                              ? 'bg-white text-[#074E44] shadow-xs'
                              : 'text-[#5C6B68] hover:text-[#1A2322]'
                          }`}
                        >
                          Ricerca Rapida
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogSearchMode('cascade')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                            catalogSearchMode === 'cascade'
                              ? 'bg-white text-[#074E44] shadow-xs'
                              : 'text-[#5C6B68] hover:text-[#1A2322]'
                          }`}
                        >
                          Marca → Modello
                        </button>
                      </div>
                    </div>

                    {catalogSearchMode === 'quick' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-[#8A9895] absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Digita marca, modello o cilindrata (es. Golf 7 2.0 TDI, Fiat Panda 1.2)..."
                            value={catalogSearchTerm}
                            onChange={(e) => handleCatalogSearchChange(e.target.value)}
                            className={`${uiClasses.input} pl-9 pr-8`}
                          />
                          {isSearchingCatalog && (
                            <Loader2 className="w-4 h-4 text-[#074E44] animate-spin absolute right-3 top-2.5" />
                          )}
                        </div>

                        {catalogSearchError && (
                          <AlertBanner tone="danger">{catalogSearchError}</AlertBanner>
                        )}

                        {catalogSearchResults.length > 0 && (
                          <div className="max-h-48 overflow-y-auto bg-white border border-[#E2E8E7] rounded-xl divide-y divide-[#EEF2F1]">
                            {catalogSearchResults.map((cv) => (
                              <button
                                key={cv.id}
                                type="button"
                                onClick={() => handleSelectCatalogVehicle(cv)}
                                className="w-full text-left px-3 py-2.5 hover:bg-[#EAF3F1]/60 transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <div>
                                  <div className="text-xs font-bold text-[#1A2322] group-hover:text-[#074E44]">
                                    {cv.make} {cv.model}{' '}
                                    <span className="font-normal text-[#5C6B68]">
                                      {cv.generation ? `(${cv.generation})` : ''}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#5C6B68]">
                                    {cv.version || 'Base'} • {cv.engine || '—'} • {cv.fuel_type || '—'} •{' '}
                                    {cv.year_from || '—'}–{cv.year_to || 'oggi'}
                                  </div>
                                </div>
                                <span className="text-[11px] font-semibold text-[#074E44] flex items-center gap-0.5">
                                  <span>Seleziona</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-[#5C6B68] block mb-1">
                            1. Marca
                          </label>
                          <select
                            value={selectedMake}
                            onChange={(e) => handleMakeSelect(e.target.value)}
                            className={uiClasses.select}
                          >
                            <option value="">Seleziona Marca...</option>
                            {catalogMakes.map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name} ({m.count})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#5C6B68] block mb-1">
                            2. Modello
                          </label>
                          <select
                            value={selectedModel}
                            disabled={!selectedMake || isLoadingCascade}
                            onChange={(e) => handleModelSelect(e.target.value)}
                            className={uiClasses.select}
                          >
                            <option value="">
                              {isLoadingCascade ? 'Caricamento...' : 'Seleziona Modello...'}
                            </option>
                            {catalogModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[#5C6B68] block mb-1">
                            3. Variante
                          </label>
                          <select
                            disabled={!selectedModel || isLoadingCascade || catalogVariants.length === 0}
                            onChange={(e) => {
                              const found = catalogVariants.find((v) => v.id === e.target.value);
                              if (found) handleSelectCatalogVehicle(found);
                            }}
                            className={uiClasses.select}
                          >
                            <option value="">
                              {catalogVariants.length > 0
                                ? `Scegli tra ${catalogVariants.length} varianti...`
                                : 'In attesa del modello...'}
                            </option>
                            {catalogVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.version || 'Base'} - {v.engine || ''} ({v.year_from || '—'}-
                                {v.year_to || 'oggi'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEZIONE 2: ANAGRAFICA RICAMBIO */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#074E44] uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-[#EEF2F1]">
              <FileText className="w-3.5 h-3.5" />
              <span>2. Dati del Ricambio & Identificativi</span>
            </div>

            <div>
              <label className={uiClasses.label}>
                Nome del Ricambio <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!side) {
                    const detected = detectSideFromName(e.target.value);
                    if (detected) setSide(detected);
                  }
                }}
                placeholder="es. Portiera anteriore destra, Faro anteriore sinistro, Alternatore..."
                className={`${uiClasses.input} text-sm`}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={uiClasses.label}>Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={uiClasses.select}
                >
                  <option value="">Seleziona categoria...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${uiClasses.label} flex items-center gap-1`}>
                  <Hash className="w-3.5 h-3.5 text-[#5C6B68]" />
                  <span>Codice OEM Casa Madre</span>
                </label>
                <input
                  type="text"
                  value={oemCode}
                  onChange={(e) => setOemCode(e.target.value)}
                  placeholder="es. 51786521, 03L130277B"
                  className={`${uiClasses.input} font-mono`}
                />
              </div>

              <div>
                <label className={`${uiClasses.label} flex items-center gap-1`}>
                  <Hash className="w-3.5 h-3.5 text-[#5C6B68]" />
                  <span>Codice Interno / Matricola</span>
                </label>
                <input
                  type="text"
                  value={internalCode}
                  onChange={(e) => setInternalCode(e.target.value)}
                  placeholder="es. RIC-2026-0045"
                  className={`${uiClasses.input} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* SEZIONE 3: CONDIZIONI & POSIZIONE */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#074E44] uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-[#EEF2F1]">
              <Layers className="w-3.5 h-3.5" />
              <span>3. Condizioni & Posizionamento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={uiClasses.label}>Condizione Pezzo</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as InventoryItem['condition'])}
                  className={uiClasses.select}
                >
                  <option value="ottimo">Ottimo (Pari al nuovo / testato)</option>
                  <option value="buono">Buono (Normale usura funzionante)</option>
                  <option value="discreto">Discreto (Segni estetici evidenti)</option>
                  <option value="da_revisionare">Da revisionare / Rigenerare</option>
                </select>
              </div>

              <div>
                <label className={uiClasses.label}>Lato / Posizionamento</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  className={uiClasses.select}
                >
                  <option value="">Non specificato / Centrale</option>
                  <option value="anteriore_sx">Anteriore Sinistro (SX)</option>
                  <option value="anteriore_dx">Anteriore Destro (DX)</option>
                  <option value="posteriore_sx">Posteriore Sinistro (SX)</option>
                  <option value="posteriore_dx">Posteriore Destro (DX)</option>
                  <option value="anteriore">Anteriore</option>
                  <option value="posteriore">Posteriore</option>
                  <option value="superiore">Superiore</option>
                  <option value="inferiore">Inferiore</option>
                </select>
              </div>

              <div>
                <label className={`${uiClasses.label} flex items-center gap-1`}>
                  <MapPin className="w-3.5 h-3.5 text-[#5C6B68]" />
                  <span>Ubicazione / Scaffale</span>
                </label>
                <input
                  type="text"
                  value={positionNote}
                  onChange={(e) => setPositionNote(e.target.value)}
                  placeholder="es. Corsia 3 - Scaffale B-12"
                  className={uiClasses.input}
                />
              </div>
            </div>
          </div>

          {/* SEZIONE 4: PREZZO & SPEDIZIONI */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#074E44] uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-[#EEF2F1]">
              <DollarSign className="w-3.5 h-3.5" />
              <span>4. Prezzo Vendita & Spedizione</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={uiClasses.label}>Prezzo Vendita (€ IVA incl.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="es. 85.00 (0 per bozza)"
                  className={`${uiClasses.input} text-sm font-bold text-[#074E44] tabular-nums`}
                />
              </div>

              <div>
                <label className={uiClasses.label}>
                  Giacenza Disponibile (Pz) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`${uiClasses.input} text-sm font-bold tabular-nums`}
                  required
                />
              </div>

              <div>
                <label className={uiClasses.label}>Costo Spedizione Corriere (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!shippingAvailable}
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="es. 12.00"
                  className={`${uiClasses.input} tabular-nums`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#2E3C3A]">
                <input
                  type="checkbox"
                  checked={pickupAvailable}
                  onChange={(e) => setPickupAvailable(e.target.checked)}
                  className="rounded border-[#C6DFDA] text-[#074E44] focus:ring-[#074E44] cursor-pointer"
                />
                <span>Ritiro a mano in sede consentito</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#2E3C3A]">
                <input
                  type="checkbox"
                  checked={shippingAvailable}
                  onChange={(e) => setShippingAvailable(e.target.checked)}
                  className="rounded border-[#C6DFDA] text-[#074E44] focus:ring-[#074E44] cursor-pointer"
                />
                <span>Spedizione nazionale espressa disponibile</span>
              </label>
            </div>
          </div>

          {/* SEZIONE 5: DESCRIZIONE & NOTE */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#EEF2F1]">
              <div className="text-xs font-bold text-[#074E44] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>5. Descrizione Annuncio Autopia</span>
              </div>

              <Button
                variant="secondary"
                size="xs"
                onClick={handleGenerateSmartDescription}
                title="Compila la descrizione basata sui dati del veicolo selezionato"
              >
                <Sparkles className="w-3 h-3 text-[#074E44]" />
                <span>Genera Descrizione</span>
              </Button>
            </div>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="es. Portiera anteriore destra per Volkswagen Golf 7, motorizzazione 2.0 TDI..."
              className={uiClasses.textarea}
            />

            <div>
              <label className="text-[11px] text-[#5C6B68] font-semibold block mb-1">
                Note Interne Officina (non visibili al cliente finale)
              </label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Costo di smontaggio, fornitore, condizioni di prova..."
                className={uiClasses.textarea}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FAFBFB] border-t border-[#EEF2F1] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#5C6B68]">
            {originType === 'catalog' && selectedCatalogVehicle && (
              <span>
                Compatibilità:{' '}
                <strong className="text-[#1A2322]">
                  {selectedCatalogVehicle.make} {selectedCatalogVehicle.model}
                </strong>
              </span>
            )}
            {originType === 'yard' && selectedSellerVehicleId && (
              <span>
                Origine: <strong className="text-[#1A2322]">Veicolo Piazzale</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Annulla
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => executeSubmit('inactive')}
              loading={isSubmitting}
              title="Salva come bozza offline per completare in seguito"
            >
              {!isSubmitting && <Save className="w-3.5 h-3.5 text-[#074E44]" />}
              <span>Salva Bozza Offline</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => executeSubmit('available')}
              loading={isSubmitting}
              title="Verifica e pubblica subito online su Autopia Shop"
            >
              {!isSubmitting && <Check className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Pubblicazione...' : 'Pubblica Online'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
