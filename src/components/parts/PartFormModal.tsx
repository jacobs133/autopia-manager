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
  AlertCircle,
  Loader2,
  Check,
  Search,
  Database as DatabaseIcon,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Save,
  CheckCircle2,
} from 'lucide-react';
import type {
  InventoryItem,
  PartCategory,
  PART_CONDITIONS,
  SIDES_OPTIONS,
} from '../../types/inventory';
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
  const [status, setStatus] = useState<InventoryItem['status']>(itemToEdit?.status || 'inactive');

  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [yardVehicles, setYardVehicles] = useState<SellerVehicle[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Modalità selezione origine veicolo: 'yard' (Piazzale) | 'catalog' (Banca dati 11.000+)
  const [originType, setOriginType] = useState<'yard' | 'catalog'>('yard');
  const [selectedSellerVehicleId, setSelectedSellerVehicleId] = useState<string>(
    itemToEdit?.seller_vehicle_id || initialSellerVehicleId || ''
  );
  const [selectedCatalogVehicle, setSelectedCatalogVehicle] = useState<CatalogVehicle | null>(null);

  // Stato per ricerca veicolo nel catalogo 11.000+
  const [catalogSearchMode, setCatalogSearchMode] = useState<'quick' | 'cascade'>('quick');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogSearchResults, setCatalogSearchResults] = useState<CatalogVehicle[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogSearchError, setCatalogSearchError] = useState<string | null>(null);

  // Selezione guidata catalogo (Marca -> Modello -> Variante)
  const [catalogMakes, setCatalogMakes] = useState<CatalogMakeInfo[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [catalogVariants, setCatalogVariants] = useState<CatalogVehicle[]>([]);
  const [isLoadingCascade, setIsLoadingCascade] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce ricerca catalogo
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Carica metadati (categorie e veicoli piazzale)
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

          // Se non ci sono veicoli nel parco auto, forza la selezione dal catalogo centrale!
          if (yardList.length === 0) {
            setOriginType('catalog');
          } else if (itemToEdit?.source_vehicle_id && !itemToEdit.seller_vehicle_id) {
            setOriginType('catalog');
          }

          // Se l'item ha source_vehicle_id, recupera i dettagli del veicolo di catalogo
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

  // Carica marche per selezione guidata catalogo quando si passa a modalità catalogo
  useEffect(() => {
    if (originType === 'catalog' && catalogMakes.length === 0) {
      fetchCatalogMakes().then((res) => {
        if (res.details) setCatalogMakes(res.details);
      });
    }
  }, [originType, catalogMakes.length]);

  // Gestione ricerca rapida catalogo con debounce
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

  // Selezione guidata: cambio marca
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

  // Selezione guidata: cambio modello
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

  // Quando viene selezionato un veicolo di catalogo
  const handleSelectCatalogVehicle = (vehicle: CatalogVehicle) => {
    setSelectedCatalogVehicle(vehicle);

    // Auto-genera descrizione se vuota
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

    // Auto-rileva lato se non specificato
    if (!side && title.trim()) {
      const autoSide = detectSideFromName(title.trim());
      if (autoSide) setSide(autoSide);
    }
  };

  // Generatore manuale di descrizione intelligente al click sul pulsante
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

  // Salvataggio ricambio (con supporto esplicito a Bozza vs Pubblicazione)
  const executeSubmit = async (targetStatus: InventoryItem['status']) => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Inserisci il nome o la descrizione del ricambio');
      return;
    }

    // REGOLA VINCOLANTE: se il parco auto è vuoto o siamo in modalità catalogo, la selezione del veicolo dal catalogo 11.000+ è OBBLIGATORIA
    if (originType === 'catalog' || yardVehicles.length === 0) {
      if (!selectedCatalogVehicle) {
        setErrorMessage(
          'Selezione obbligatoria del veicolo: scegli un veicolo dal catalogo ufficiale Autopia di oltre 11.000 modelli per associare la compatibilità.'
        );
        return;
      }
    } else if (originType === 'yard') {
      if (!selectedSellerVehicleId) {
        setErrorMessage(
          'Seleziona il veicolo di provenienza dal piazzale o passa a "Seleziona dal Catalogo Generale".'
        );
        return;
      }
    }

    const numPrice = parseFloat(price);
    if (targetStatus === 'available') {
      if (isNaN(numPrice) || numPrice <= 0) {
        setErrorMessage('Per la pubblicazione online è obbligatorio specificare un prezzo maggiore di 0€.');
        return;
      }
    } else {
      // Se salvato come bozza, ammettiamo anche 0
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

    // Determinazione source_vehicle_id e seller_vehicle_id
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
          setErrorMessage(res.error || 'Errore durante l\'aggiornamento del ricambio');
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl my-6 overflow-hidden shadow-2xl flex flex-col text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Intestazione */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? 'Modifica Scheda Ricambio' : 'Aggiungi Nuovo Ricambio'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `ID Inventario: ${itemToEdit?.id}`
                  : 'Creazione bozza o annuncio con associazione al veicolo dal parco o dal catalogo centrale (11.000+ veicoli)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SEZIONE 1: ORIGINE VEICOLO (PARCO AUTO vs CATALOGO 11.000+) */}
          {/* ========================================================= */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Car className="w-4 h-4" />
                <span>1. Veicolo di Provenienza & Compatibilità</span>
              </div>

              {yardVehicles.length > 0 && (
                <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setOriginType('yard')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      originType === 'yard'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Veicolo Parco Auto ({yardVehicles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginType('catalog')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                      originType === 'catalog'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <DatabaseIcon className="w-3 h-3" />
                    <span>Catalogo Generale (11.000+)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Avviso se Parco Auto è vuoto */}
            {yardVehicles.length === 0 && (
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs text-blue-200 flex items-start space-x-2">
                <DatabaseIcon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-blue-300">Nessun veicolo presente nel piazzale</div>
                  <div>
                    Non hai veicoli registrati nel tuo parco auto. Come previsto, l'associazione è{' '}
                    <strong>obbligatoria</strong> e avviene selezionando il veicolo dal catalogo centrale
                    Autopia di oltre 11.000 modelli.
                  </div>
                </div>
              </div>
            )}

            {/* CASO A: Selezione dal Parco Auto Demolitore */}
            {originType === 'yard' && yardVehicles.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold block">
                  Seleziona Veicolo Demolito nel Piazzale
                </label>
                <select
                  value={selectedSellerVehicleId}
                  onChange={(e) => {
                    setSelectedSellerVehicleId(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Seleziona un veicolo dal piazzale --</option>
                  {yardVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate ? `[Targa: ${v.plate}] ` : ''}
                      {v.make} {v.model} {v.generation ? `(${v.generation})` : ''} -{' '}
                      {v.engine || ''} {v.fuel_type || ''} {v.year ? `Anno ${v.year}` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Il ricambio erediterà targa, telaio e compatibilità del veicolo.</span>
                  <button
                    type="button"
                    onClick={() => setOriginType('catalog')}
                    className="text-amber-400 hover:underline cursor-pointer font-semibold"
                  >
                    Non è nel piazzale? Seleziona dal Catalogo Generale →
                  </button>
                </div>
              </div>
            )}

            {/* CASO B: Selezione dal Catalogo Generale (11.000+ veicoli) */}
            {originType === 'catalog' && (
              <div className="space-y-3">
                {selectedCatalogVehicle ? (
                  // Scheda veicolo selezionato con pulsante cambio
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                          <span>
                            {selectedCatalogVehicle.make} {selectedCatalogVehicle.model}
                          </span>
                          {selectedCatalogVehicle.generation && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
                              {selectedCatalogVehicle.generation}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {selectedCatalogVehicle.version || 'Standard'} •{' '}
                          {selectedCatalogVehicle.engine || '—'} •{' '}
                          {selectedCatalogVehicle.fuel_type || '—'} • Anni:{' '}
                          {selectedCatalogVehicle.year_from || '—'} –{' '}
                          {selectedCatalogVehicle.year_to || 'oggi'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCatalogVehicle(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cambia Veicolo
                    </button>
                  </div>
                ) : (
                  // Ricerca rapida o guidata nel catalogo
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Cerca veicolo nella banca dati centrale (11.346 modelli)
                      </span>
                      <div className="flex items-center space-x-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setCatalogSearchMode('quick')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            catalogSearchMode === 'quick'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Ricerca Rapida
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogSearchMode('cascade')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            catalogSearchMode === 'cascade'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Marca → Modello
                        </button>
                      </div>
                    </div>

                    {catalogSearchMode === 'quick' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Digita marca, modello, cilindrata: es. 'Golf 7 2.0 TDI', 'Fiat Panda 1.2', 'Clio IV'..."
                            value={catalogSearchTerm}
                            onChange={(e) => handleCatalogSearchChange(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          {isSearchingCatalog && (
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3 top-2.5" />
                          )}
                        </div>

                        {catalogSearchError && (
                          <div className="p-2.5 bg-red-950/40 border border-red-800/50 rounded text-red-300 text-xs">
                            {catalogSearchError}
                          </div>
                        )}

                        {catalogSearchResults.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 divide-y divide-slate-800/40">
                            {catalogSearchResults.map((cv) => (
                              <button
                                key={cv.id}
                                type="button"
                                onClick={() => handleSelectCatalogVehicle(cv)}
                                className="w-full text-left p-2 rounded hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <div>
                                  <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                                    {cv.make} {cv.model}{' '}
                                    <span className="font-normal text-slate-400">
                                      {cv.generation ? `(${cv.generation})` : ''}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {cv.version || 'Base'} • {cv.engine || '—'} • {cv.fuel_type || '—'} •{' '}
                                    {cv.year_from || '—'}–{cv.year_to || 'oggi'}
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                                  <span>Seleziona</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Selezione Guidata Marca -> Modello -> Variante
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">1. Marca</label>
                          <select
                            value={selectedMake}
                            onChange={(e) => handleMakeSelect(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
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
                          <label className="text-[11px] text-slate-400 block mb-1">2. Modello</label>
                          <select
                            value={selectedModel}
                            disabled={!selectedMake || isLoadingCascade}
                            onChange={(e) => handleModelSelect(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-40"
                          >
                            <option value="">
                              {isLoadingCascade ? 'Caricamento modelli...' : 'Seleziona Modello...'}
                            </option>
                            {catalogModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">3. Variante</label>
                          <select
                            disabled={!selectedModel || isLoadingCascade || catalogVariants.length === 0}
                            onChange={(e) => {
                              const found = catalogVariants.find((v) => v.id === e.target.value);
                              if (found) handleSelectCatalogVehicle(found);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-40"
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

          {/* ========================================================= */}
          {/* SEZIONE 2: ANAGRAFICA RICAMBIO */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <FileText className="w-3.5 h-3.5" />
              <span>2. Dati del Ricambio & Identificativi</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Nome del Ricambio <span className="text-red-400">*</span>
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
                placeholder="es. Portiera anteriore destra, Faro anteriore sinistro, Alternatore, Turbina..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Categoria Tipologia
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
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
                <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Codice OEM Casa Madre</span>
                </label>
                <input
                  type="text"
                  value={oemCode}
                  onChange={(e) => setOemCode(e.target.value)}
                  placeholder="es. 51786521, 03L130277B"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Codice Interno / Matricola</span>
                </label>
                <input
                  type="text"
                  value={internalCode}
                  onChange={(e) => setInternalCode(e.target.value)}
                  placeholder="es. RIC-2026-0045"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEZIONE 3: CONDIZIONI, POSIZIONE & SCAFFALE */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <Layers className="w-3.5 h-3.5" />
              <span>3. Condizioni & Posizionamento</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Condizione Pezzo
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as InventoryItem['condition'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ottimo">Ottimo (Pari al nuovo / testato)</option>
                  <option value="buono">Buono (Normale usura funzionante)</option>
                  <option value="discreto">Discreto (Segni estetici evidenti)</option>
                  <option value="da_revisionare">Da revisionare / Rigenerare</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Lato / Posizionamento
                </label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
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
                <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ubicazione / Scaffale</span>
                </label>
                <input
                  type="text"
                  value={positionNote}
                  onChange={(e) => setPositionNote(e.target.value)}
                  placeholder="es. Corsia 3 - Scaffale B-12"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEZIONE 4: PREZZO, GIACENZA & SPEDIZIONI */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <DollarSign className="w-3.5 h-3.5" />
              <span>4. Prezzo Vendita & Spedizione</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Prezzo Vendita (€ IVA incl.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="es. 85.00 (oppure 0 per bozza)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Giacenza Disponibile (Pz) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Costo Spedizione Corriere (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!shippingAvailable}
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="es. 12.00"
                  className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6 pt-1 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={pickupAvailable}
                  onChange={(e) => setPickupAvailable(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <span>Ritiro a mano in autodemolizione consentito</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={shippingAvailable}
                  onChange={(e) => setShippingAvailable(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <span>Spedizione nazionale espressa disponibile</span>
              </label>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEZIONE 5: DESCRIZIONE INTELLIGENTE & NOTE */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>5. Descrizione Annuncio Autopia</span>
              </div>

              <button
                type="button"
                onClick={handleGenerateSmartDescription}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Compila la descrizione formattata basata sui dati tecnici del veicolo selezionato"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Genera Descrizione Intelligente</span>
              </button>
            </div>

            <div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="es. Portiera anteriore destra per Volkswagen Golf 7, motorizzazione 2.0 TDI, anno 2016. Ricambio originale usato proveniente da veicolo demolito..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                Note Interne Riservate all'Autodemolitore (non visibili al cliente finale)
              </label>
              <textarea
                rows={1}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Costo di smontaggio, fornitore, condizioni di prova o dettagli operativi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Footer con Pulsanti Chiari (Bozza Offline vs Pubblica Subito) */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            {originType === 'catalog' && selectedCatalogVehicle && (
              <span>
                Compatibilità: <strong className="text-slate-200">{selectedCatalogVehicle.make} {selectedCatalogVehicle.model}</strong>
              </span>
            )}
            {originType === 'yard' && selectedSellerVehicleId && (
              <span>
                Origine: <strong className="text-slate-200">Veicolo Piazzale</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Annulla
            </button>

            {/* Salva come Bozza Offline */}
            <button
              type="button"
              onClick={() => executeSubmit('inactive')}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Salva come bozza offline per revisionare o completare in seguito"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Salva Bozza Offline</span>
            </button>

            {/* Pubblica Subito Online */}
            <button
              type="button"
              onClick={() => executeSubmit('available')}
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              title="Verifica e pubblica subito online su Autopia Shop"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Pubblicazione...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Pubblica Online</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
