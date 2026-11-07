import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Car,
  Save,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  Database as DatabaseIcon,
  RefreshCw,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { SellerVehicle, CatalogVehicle, CatalogMakeInfo } from '../../types/vehicles';
import {
  VEHICLE_STATUS_OPTIONS,
} from '../../types/vehicles';
import {
  createSellerVehicle,
  updateSellerVehicle,
  fetchCatalogVehicleById,
  searchCatalogVehicles,
  fetchCatalogMakes,
  fetchCatalogModels,
  fetchCatalogGenerations,
  fetchCatalogVariants,
} from '../../services/vehiclesService';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedVehicle: SellerVehicle, andOpenPartsExtractor?: boolean) => void;
  sellerId: string;
  vehicleToEdit?: SellerVehicle | null;
  initialCatalogVehicle?: CatalogVehicle | null;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sellerId,
  vehicleToEdit,
  initialCatalogVehicle,
}) => {
  const isEditing = Boolean(vehicleToEdit);

  // Variante catalogo centrale selezionata
  const [selectedCatalogVehicle, setSelectedCatalogVehicle] = useState<CatalogVehicle | null>(null);
  const [isLoadingCatalogItem, setIsLoadingCatalogItem] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState<string | null>(null);

  // Modalità di selezione catalogo: 'quick' (ricerca rapida) | 'cascade' (a cascata)
  const [selectionMode, setSelectionMode] = useState<'quick' | 'cascade'>('quick');

  // Stato Ricerca Rapida
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<CatalogVehicle[]>([]);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const [quickSearchError, setQuickSearchError] = useState<string | null>(null);
  const [hasSearchedQuick, setHasSearchedQuick] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stato Selezione a Cascata
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [makeDetails, setMakeDetails] = useState<CatalogMakeInfo[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [selectedMake, setSelectedMake] = useState<string>('');

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const [availableGenerations, setAvailableGenerations] = useState<string[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<string>('');

  const [availableVariants, setAvailableVariants] = useState<CatalogVehicle[]>([]);
  const [variantFilterTerm, setVariantFilterTerm] = useState<string>('');
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  // Campi specifici del singolo esemplare fisico nel piazzale
  const [year, setYear] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('in_attesa');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Conferma scostamento anno immatricolazione rispetto agli anni di produzione standard
  const [confirmYearMismatch, setConfirmYearMismatch] = useState(false);

  // Stato submit form
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Caricamento iniziale e reset
  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);
    setCatalogLoadError(null);
    setConfirmYearMismatch(false);
    setVariantFilterTerm('');

    if (vehicleToEdit) {
      // Modifica veicolo esistente
      setYear(vehicleToEdit.year ? String(vehicleToEdit.year) : '');
      setPlate(vehicleToEdit.plate || '');
      setVin(vehicleToEdit.vin || '');
      setArrivalDate(vehicleToEdit.arrival_date || new Date().toISOString().split('T')[0]);
      setLocation(vehicleToEdit.location || '');
      setStatus(vehicleToEdit.status || 'in_attesa');
      setNotes(vehicleToEdit.notes || '');
      setPhotoUrl(vehicleToEdit.photo_url || '');

      // Estrazione eventuale chilometraggio salvato nelle note
      const kmMatch = vehicleToEdit.notes?.match(/\[Km:\s*([^\]]+)\]/i);
      if (kmMatch) {
        setMileage(kmMatch[1].trim());
      } else {
        setMileage('');
      }

      // Se il veicolo ha un catalog_vehicle_id, caricalo dal catalogo centrale
      if (vehicleToEdit.catalog_vehicle_id) {
        setIsLoadingCatalogItem(true);
        fetchCatalogVehicleById(vehicleToEdit.catalog_vehicle_id)
          .then((res) => {
            if (res.error) {
              setCatalogLoadError(res.error);
              setSelectedCatalogVehicle(null);
            } else if (res.data) {
              setSelectedCatalogVehicle(res.data);
            } else {
              setCatalogLoadError('Il record catalogo associato non è stato trovato nel database');
              setSelectedCatalogVehicle(null);
            }
          })
          .catch((err) => {
            setCatalogLoadError(err?.message || 'Errore lettura catalogo');
            setSelectedCatalogVehicle(null);
          })
          .finally(() => {
            setIsLoadingCatalogItem(false);
          });
      } else {
        setSelectedCatalogVehicle(null);
      }
    } else if (initialCatalogVehicle) {
      // Pre-compilazione da catalogo centrale selezionato
      setSelectedCatalogVehicle(initialCatalogVehicle);
      setYear(String(initialCatalogVehicle.year_from || new Date().getFullYear()));
      setPlate('');
      setVin('');
      setArrivalDate(new Date().toISOString().split('T')[0]);
      setLocation('');
      setStatus('in_attesa');
      setNotes('');
      setPhotoUrl('');
      setQuickSearchTerm('');
      setQuickSearchResults([]);
      setHasSearchedQuick(false);
    } else {
      // Nuovo inserimento
      setSelectedCatalogVehicle(null);
      setYear(String(new Date().getFullYear()));
      setPlate('');
      setVin('');
      setArrivalDate(new Date().toISOString().split('T')[0]);
      setLocation('');
      setStatus('in_attesa');
      setNotes('');
      setPhotoUrl('');
      setQuickSearchTerm('');
      setQuickSearchResults([]);
      setHasSearchedQuick(false);
      setSelectedMake('');
      setSelectedModel('');
      setSelectedGeneration('');
      setAvailableVariants([]);
    }
  }, [isOpen, vehicleToEdit, initialCatalogVehicle]);

  // 2. Ricerca rapida con debounce
  const handleQuickSearchChange = (value: string) => {
    setQuickSearchTerm(value);
    setQuickSearchError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setQuickSearchResults([]);
      setHasSearchedQuick(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingQuick(true);
      setHasSearchedQuick(true);
      try {
        const res = await searchCatalogVehicles(value, 80);
        if (res.error) {
          setQuickSearchError(res.error);
          setQuickSearchResults([]);
        } else {
          setQuickSearchResults(res.data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Errore ricerca catalogo';
        setQuickSearchError(msg);
        setQuickSearchResults([]);
      } finally {
        setIsSearchingQuick(false);
      }
    }, 300);
  };

  // 3. Gestione Navigazione a Cascata: Caricamento Marche
  const loadMakes = useCallback(async () => {
    setIsLoadingMakes(true);
    setCascadeError(null);
    try {
      const res = await fetchCatalogMakes();
      if (res.error) {
        setCascadeError(res.error);
        setAvailableMakes([]);
        setMakeDetails([]);
      } else {
        setAvailableMakes(res.data);
        setMakeDetails(res.details || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore caricamento marche';
      setCascadeError(msg);
      setAvailableMakes([]);
      setMakeDetails([]);
    } finally {
      setIsLoadingMakes(false);
    }
  }, []);

  useEffect(() => {
    if (selectionMode === 'cascade' && availableMakes.length === 0 && !isLoadingMakes) {
      loadMakes();
    }
  }, [selectionMode, availableMakes.length, isLoadingMakes, loadMakes]);

  // Gestione cambio marca
  const handleMakeChange = async (make: string) => {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedGeneration('');
    setAvailableModels([]);
    setAvailableGenerations([]);
    setAvailableVariants([]);
    setCascadeError(null);

    if (!make) return;

    setIsLoadingModels(true);
    try {
      const res = await fetchCatalogModels(make);
      if (res.error) {
        setCascadeError(res.error);
      } else {
        setAvailableModels(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore modelli';
      setCascadeError(msg);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Gestione cambio modello
  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    setSelectedGeneration('');
    setAvailableGenerations([]);
    setAvailableVariants([]);
    setCascadeError(null);

    if (!model || !selectedMake) return;

    // Carica generazioni e contestualmente le varianti di base
    setIsLoadingGenerations(true);
    setIsLoadingVariants(true);
    try {
      const [genRes, varRes] = await Promise.all([
        fetchCatalogGenerations(selectedMake, model),
        fetchCatalogVariants({ make: selectedMake, model }),
      ]);

      if (genRes.error) {
        setCascadeError(genRes.error);
      } else {
        setAvailableGenerations(genRes.data);
      }

      if (varRes.error) {
        setCascadeError(varRes.error);
      } else {
        setAvailableVariants(varRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore caricamento dati modello';
      setCascadeError(msg);
    } finally {
      setIsLoadingGenerations(false);
      setIsLoadingVariants(false);
    }
  };

  // Gestione cambio generazione
  const handleGenerationChange = async (generation: string) => {
    setSelectedGeneration(generation);
    setCascadeError(null);

    if (!selectedMake || !selectedModel) return;

    setIsLoadingVariants(true);
    try {
      const varRes = await fetchCatalogVariants({
        make: selectedMake,
        model: selectedModel,
        generation: generation || null,
      });

      if (varRes.error) {
        setCascadeError(varRes.error);
      } else {
        setAvailableVariants(varRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore caricamento varianti';
      setCascadeError(msg);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  // Selezione della variante ufficiale
  const handleSelectVariant = (variant: CatalogVehicle) => {
    setSelectedCatalogVehicle(variant);
    setFormError(null);
    setConfirmYearMismatch(false);
  };

  // Rimozione / Sostituzione variante selezionata
  const handleClearSelectedCatalog = () => {
    setSelectedCatalogVehicle(null);
    setConfirmYearMismatch(false);
  };

  // Controllo coerenza anni produzione con anno di immatricolazione
  const yearNumber = year ? Number(year) : null;
  const isYearMismatch = Boolean(
    selectedCatalogVehicle &&
      yearNumber &&
      ((selectedCatalogVehicle.year_from && yearNumber < selectedCatalogVehicle.year_from) ||
        (selectedCatalogVehicle.year_to && yearNumber > selectedCatalogVehicle.year_to))
  );

  // 4. Salvataggio veicolo
  // 4. Salvataggio veicolo
  const executeSubmit = async (andOpenPartsExtractor = false) => {
    setFormError(null);

    if (!selectedCatalogVehicle) {
      setFormError(
        'È obbligatorio selezionare un veicolo dal catalogo centrale ufficiale Autopia. Non è consentito inserire marche o modelli inventati.'
      );
      return;
    }

    if (yearNumber && (isNaN(yearNumber) || yearNumber < 1950 || yearNumber > 2035)) {
      setFormError('Inserisci un anno di immatricolazione valido (tra 1950 e 2035)');
      return;
    }

    if (isYearMismatch && !confirmYearMismatch) {
      setFormError(
        `L'anno di immatricolazione (${yearNumber}) non rientra nel periodo di produzione del modello (${selectedCatalogVehicle.year_from || '—'} - ${selectedCatalogVehicle.year_to || 'in corso'}). Spunta la casella di conferma se si tratta di immatricolazione speciale o prima registrazione tardiva.`
      );
      return;
    }

    // Costruzione note strutturate con eventuale chilometraggio
    let finalNotes = notes.trim();
    if (mileage.trim()) {
      const cleanKm = mileage.trim().replace(/\D/g, '');
      const formattedKm = cleanKm ? `${Number(cleanKm).toLocaleString('it-IT')} km` : mileage.trim();
      const kmTag = `[Km: ${formattedKm}]`;
      if (!finalNotes.includes('[Km:')) {
        finalNotes = finalNotes ? `${kmTag} ${finalNotes}` : kmTag;
      }
    }

    setIsSubmitting(true);
    try {
      if (isEditing && vehicleToEdit) {
        // Aggiornamento veicolo esistente
        const { data, error } = await updateSellerVehicle(sellerId, vehicleToEdit.id, {
          catalog_vehicle_id: selectedCatalogVehicle.id,
          make: selectedCatalogVehicle.make,
          model: selectedCatalogVehicle.model,
          version: selectedCatalogVehicle.version,
          generation: selectedCatalogVehicle.generation,
          engine: selectedCatalogVehicle.engine,
          power: selectedCatalogVehicle.power,
          fuel_type: selectedCatalogVehicle.fuel_type,
          transmission: selectedCatalogVehicle.transmission,
          body_style: selectedCatalogVehicle.body_style,
          year: yearNumber,
          plate: plate || null,
          vin: vin || null,
          arrival_date: arrivalDate || null,
          location: location || null,
          status: status || 'in_attesa',
          notes: finalNotes || null,
          photo_url: photoUrl || null,
        });

        if (error) {
          setFormError(error);
        } else if (data) {
          onSuccess(data, andOpenPartsExtractor);
          onClose();
        }
      } else {
        // Creazione nuovo veicolo collegato al catalogo
        const { data, error } = await createSellerVehicle(sellerId, {
          catalog_vehicle_id: selectedCatalogVehicle.id,
          make: selectedCatalogVehicle.make,
          model: selectedCatalogVehicle.model,
          version: selectedCatalogVehicle.version,
          generation: selectedCatalogVehicle.generation,
          engine: selectedCatalogVehicle.engine,
          power: selectedCatalogVehicle.power,
          fuel_type: selectedCatalogVehicle.fuel_type,
          transmission: selectedCatalogVehicle.transmission,
          body_style: selectedCatalogVehicle.body_style,
          year: yearNumber,
          plate: plate || null,
          vin: vin || null,
          arrival_date: arrivalDate || null,
          location: location || null,
          status: status || 'in_attesa',
          notes: finalNotes || null,
          photo_url: photoUrl || null,
        });

        if (error) {
          setFormError(error);
        } else if (data) {
          onSuccess(data, andOpenPartsExtractor);
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto durante il salvataggio';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmit(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Intestazione Modal */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <DatabaseIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-100">
                  {isEditing ? 'Modifica Scheda Veicolo Demolito' : 'Registra Nuovo Veicolo Demolito'}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-950/40 text-amber-300 border-amber-800/40 uppercase">
                  Catalogo Ufficiale Autopia
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Collegamento certificato alla banca dati `public.vehicles` per tracciabilità ricambi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Scrollabile */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans">
          {formError && (
            <div className="p-3 bg-red-950/60 border border-red-800/70 rounded-lg text-red-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* SEZIONE 1: SELEZIONE DEL MODELLO DAL CATALOGO CENTRALE */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Selezione Veicolo dal Catalogo Centrale Autopia</span>
              </div>
              {selectedCatalogVehicle && (
                <span className="text-[10px] text-emerald-400 font-normal flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Variante Collegata</span>
                </span>
              )}
            </div>

            {/* Loading veicolo catalogo collegato in modalità modifica */}
            {isLoadingCatalogItem && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center space-x-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Caricamento specifiche dal catalogo centrale...</span>
              </div>
            )}

            {/* Errore caricamento catalogo collegato */}
            {catalogLoadError && !isLoadingCatalogItem && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-200 flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Attenzione: {catalogLoadError}</span>
                    <span className="text-[11px] text-slate-400">
                      Seleziona una variante dal catalogo sottostante per associare o correggere il veicolo.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CASO A: VARIANTE CATALOGO GIÀ SELEZIONATA */}
            {selectedCatalogVehicle && !isLoadingCatalogItem ? (
              <div className="bg-slate-950 border-2 border-emerald-500/40 rounded-xl p-4 space-y-3 shadow-lg shadow-emerald-950/20">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-bold text-slate-100">
                        {selectedCatalogVehicle.make} {selectedCatalogVehicle.model}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase flex items-center space-x-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Catalogo Autopia Certificato</span>
                      </span>
                    </div>
                    <div className="text-xs text-amber-400 font-medium">
                      {selectedCatalogVehicle.version || 'Versione standard'}
                      {selectedCatalogVehicle.generation ? ` • Serie ${selectedCatalogVehicle.generation}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelectedCatalog}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Cambia Modello</span>
                  </button>
                </div>

                {/* Specifiche tecniche ufficiali precompilate dal catalogo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Anni Produzione:</span>
                    <span className="text-slate-200 font-semibold font-mono">
                      {selectedCatalogVehicle.year_from || '—'} – {selectedCatalogVehicle.year_to || 'in corso'}
                    </span>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Alimentazione:</span>
                    <span className="text-slate-200 font-semibold">{selectedCatalogVehicle.fuel_type || '—'}</span>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Codice Motore:</span>
                    <span className="text-slate-200 font-semibold font-mono">{selectedCatalogVehicle.engine || '—'}</span>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Potenza:</span>
                    <span className="text-slate-200 font-semibold">{selectedCatalogVehicle.power || '—'}</span>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Cambio:</span>
                    <span className="text-slate-200">{selectedCatalogVehicle.transmission || '—'}</span>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Carrozzeria / Porte:</span>
                    <span className="text-slate-200">
                      {selectedCatalogVehicle.body_style || '—'} {selectedCatalogVehicle.doors ? `(${selectedCatalogVehicle.doors}p)` : ''}
                    </span>
                  </div>

                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800 sm:col-span-2">
                    <span className="text-slate-500 block text-[10px]">ID Catalogo Centrale:</span>
                    <span className="text-slate-400 font-mono text-[10px] truncate block" title={selectedCatalogVehicle.id}>
                      {selectedCatalogVehicle.id}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* CASO B: SELETTORE APERTO (RICERCA RAPIDA O NAVIGAZIONE A CASCATA) */
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                {/* Switch Modalità: Ricerca Rapida vs A Cascata */}
                <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
                  <button
                    type="button"
                    onClick={() => setSelectionMode('quick')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      selectionMode === 'quick'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Ricerca Rapida Globale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectionMode('cascade')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      selectionMode === 'cascade'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Selezione Guidata (Marca → Modello → Variante)</span>
                  </button>
                </div>

                {/* MODALITÀ 1: RICERCA RAPIDA GLOBALE */}
                {selectionMode === 'quick' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Digita per cercare: es. 'Fiat Panda 1.2', 'Golf 7 TDI', 'Ford Fiesta', 'Clio IV'..."
                        value={quickSearchTerm}
                        onChange={(e) => handleQuickSearchChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                      />
                      {isSearchingQuick && (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3 top-2.5" />
                      )}
                    </div>

                    {quickSearchError && (
                      <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{quickSearchError}</span>
                      </div>
                    )}

                    {/* Risultati Ricerca Rapida */}
                    {hasSearchedQuick && !isSearchingQuick && quickSearchResults.length === 0 && !quickSearchError && (
                      <div className="p-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-lg text-center text-slate-400 text-xs">
                        Nessun veicolo trovato nel catalogo con il termine inserito. Prova a cercare per sola marca o solo modello.
                      </div>
                    )}

                    {quickSearchResults.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Risultati trovati nel catalogo ({quickSearchResults.length}): seleziona la variante esatta
                        </span>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {quickSearchResults.map((variant) => (
                            <div
                              key={variant.id}
                              onClick={() => handleSelectVariant(variant)}
                              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/50 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-100 text-xs group-hover:text-amber-400 transition-colors">
                                    {variant.make} {variant.model}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {variant.generation ? `[${variant.generation}]` : ''}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ({variant.year_from || '—'} - {variant.year_to || 'oggi'})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                                  <span>{variant.version || 'Versione standard'}</span>
                                  {variant.engine && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-300 font-mono">{variant.engine}</span>
                                    </>
                                  )}
                                  {variant.power && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-300">{variant.power}</span>
                                    </>
                                  )}
                                  {variant.fuel_type && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-400/90 font-medium">{variant.fuel_type}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-slate-500 group-hover:text-amber-400 pl-2">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODALITÀ 2: SELEZIONE GUIDATA A CASCATA */}
                {selectionMode === 'cascade' && (
                  <div className="space-y-4">
                    {cascadeError && (
                      <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{cascadeError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Step 1: Marca */}
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">
                          1. Marca dal Catalogo <span className="text-amber-400">*</span>
                        </label>
                        <select
                          value={selectedMake}
                          onChange={(e) => handleMakeChange(e.target.value)}
                          disabled={isLoadingMakes}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">
                            {isLoadingMakes
                              ? 'Caricamento catalogo marche...'
                              : availableMakes.length > 0
                              ? `Seleziona marca (${availableMakes.length} marche)...`
                              : 'Seleziona marca...'}
                          </option>
                          {availableMakes.map((m) => {
                            const detail = makeDetails.find((d) => d.name === m);
                            return (
                              <option key={m} value={m}>
                                {m} {detail ? `(${detail.count} ver.)` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Step 2: Modello */}
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">
                          2. Modello <span className="text-amber-400">*</span>
                        </label>
                        <select
                          value={selectedModel}
                          onChange={(e) => handleModelChange(e.target.value)}
                          disabled={!selectedMake || isLoadingModels}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">
                            {!selectedMake
                              ? 'Prima seleziona una marca'
                              : isLoadingModels
                              ? 'Caricamento tutti i modelli...'
                              : `Seleziona modello (${availableModels.length} disponibili)...`}
                          </option>
                          {availableModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Step 3: Generazione / Serie */}
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">
                          3. Serie / Generazione (Opzionale)
                        </label>
                        <select
                          value={selectedGeneration}
                          onChange={(e) => handleGenerationChange(e.target.value)}
                          disabled={!selectedModel || isLoadingGenerations}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">
                            {!selectedModel
                              ? 'Prima seleziona un modello'
                              : availableGenerations.length === 0
                              ? 'Tutte le serie disponibili'
                              : 'Tutte le serie...'}
                          </option>
                          {availableGenerations.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Step 4: Lista Varianti Tecniche */}
                    {selectedModel && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300">
                            4. Seleziona la variante tecnica esatta ({availableVariants.length} nel database):
                          </span>
                          {isLoadingVariants && (
                            <span className="text-slate-400 text-[10px] flex items-center space-x-1">
                              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                              <span>Caricamento varianti...</span>
                            </span>
                          )}
                        </div>

                        {/* Barra filtro rapido varianti se presenti più varianti */}
                        {availableVariants.length > 4 && (
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                            <input
                              type="text"
                              placeholder="Filtra per motore, alimentazione o allestimento (es. 1.2, TDI, GPL, 4x4)..."
                              value={variantFilterTerm}
                              onChange={(e) => setVariantFilterTerm(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        {!isLoadingVariants && availableVariants.length === 0 && (
                          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 text-slate-400 text-center">
                            Nessuna variante trovata nel catalogo per questo modello.
                          </div>
                        )}

                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {availableVariants
                            .filter((v) => {
                              if (!variantFilterTerm.trim()) return true;
                              const q = variantFilterTerm.toLowerCase();
                              return (
                                (v.version && v.version.toLowerCase().includes(q)) ||
                                (v.engine && v.engine.toLowerCase().includes(q)) ||
                                (v.fuel_type && v.fuel_type.toLowerCase().includes(q)) ||
                                (v.power && v.power.toLowerCase().includes(q)) ||
                                (v.body_style && v.body_style.toLowerCase().includes(q)) ||
                                (v.year_from && String(v.year_from).includes(q)) ||
                                (v.year_to && String(v.year_to).includes(q))
                              );
                            })
                            .map((variant) => (
                              <div
                                key={variant.id}
                                onClick={() => handleSelectVariant(variant)}
                                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/50 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-slate-100 text-xs group-hover:text-amber-400 transition-colors">
                                      {variant.version || 'Allestimento base'}
                                    </span>
                                    {variant.generation && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        [{variant.generation}]
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-400">
                                      ({variant.year_from || '—'} - {variant.year_to || 'in corso'})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                                    <span className="text-amber-400/90 font-medium">
                                      {variant.fuel_type || 'Alim. standard'}
                                    </span>
                                    {variant.engine && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-300 font-mono">{variant.engine}</span>
                                      </>
                                    )}
                                    {variant.power && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-300">{variant.power}</span>
                                      </>
                                    )}
                                    {variant.transmission && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-400">{variant.transmission}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="px-2.5 py-1 bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 font-semibold rounded text-[11px] transition-colors"
                                >
                                  Seleziona
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEZIONE 2: DATI DELL'ESEMPLARE FISICO NEL PIAZZALE */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <Tag className="w-3.5 h-3.5" />
              <span>2. Dati Esemplare Fisico Autodemolizione</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Anno Immatricolazione Singolo Esemplare */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Anno Immatricolazione
                </label>
                <input
                  type="number"
                  placeholder="Es. 2018"
                  min="1950"
                  max="2035"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setConfirmYearMismatch(false);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Chilometraggio */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Chilometraggio (Km)
                </label>
                <input
                  type="number"
                  placeholder="Es. 145000"
                  min="0"
                  max="2000000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Targa */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Targa Veicolo
                </label>
                <input
                  type="text"
                  placeholder="Es. AB123CD"
                  maxLength={10}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* VIN */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Numero di Telaio (VIN)
                </label>
                <input
                  type="text"
                  placeholder="Es. WAUZZZ8K9DA123456"
                  maxLength={17}
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Avviso Coerenza Anno Produzione con Checkbox di Conferma */}
            {isYearMismatch && selectedCatalogVehicle && (
              <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-lg text-amber-200 space-y-2">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-xs">
                      Avviso Anno Immatricolazione:
                    </span>
                    <span className="text-[11px] text-amber-300">
                      L'anno inserito ({yearNumber}) non rientra nell'intervallo di produzione standard
                      registrato nel catalogo Autopia per questo modello ({selectedCatalogVehicle.year_from || '—'} –{' '}
                      {selectedCatalogVehicle.year_to || 'oggi'}).
                    </span>
                  </div>
                </div>

                <label className="flex items-center space-x-2 text-[11px] text-slate-200 cursor-pointer pt-1 border-t border-amber-800/50">
                  <input
                    type="checkbox"
                    checked={confirmYearMismatch}
                    onChange={(e) => setConfirmYearMismatch(e.target.checked)}
                    className="rounded border-amber-600 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
                  />
                  <span>
                    Confermo che l'immatricolazione o prima registrazione differisce dagli anni standard del catalogo
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* SEZIONE 3: ACCETTAZIONE E GESTIONE PIAZZALE */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <MapPin className="w-3.5 h-3.5" />
              <span>3. Accettazione Piazzale & Stato Lavorazione</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Data Ingresso Piazzale</span>
                </label>
                <input
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Ubicazione / Fila Piazzale
                </label>
                <input
                  type="text"
                  placeholder="Es. Piazzale Nord, Fila C4"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Stato Lavorazione
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {VEHICLE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SEZIONE 4: NOTE E DOCUMENTAZIONE */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-slate-800">
              <FileText className="w-3.5 h-3.5" />
              <span>4. Documentazione & Note Interne</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  URL Fotografia Esemplare (Opzionale)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Note Operative Interne
                </label>
                <textarea
                  rows={2}
                  placeholder="Es. Esemplare incidentato lato posteriore, motore integro, centralina recuperabile..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Pulsanti Azione */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {!selectedCatalogVehicle ? (
              <span className="text-[11px] text-amber-400/90 font-medium flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Seleziona un modello dal catalogo centrale per procedere</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Veicolo collegato a: <strong className="text-slate-200">{selectedCatalogVehicle.make} {selectedCatalogVehicle.model}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Annulla
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={() => executeSubmit(false)}
                disabled={isSubmitting || !selectedCatalogVehicle || (isYearMismatch && !confirmYearMismatch)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Aggiorna Veicolo</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => executeSubmit(false)}
                  disabled={isSubmitting || !selectedCatalogVehicle || (isYearMismatch && !confirmYearMismatch)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold rounded text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Salva il veicolo nel parco auto senza estrarre ricambi ora"
                >
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salva Solo Veicolo</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeSubmit(true)}
                  disabled={isSubmitting || !selectedCatalogVehicle || (isYearMismatch && !confirmYearMismatch)}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Salva il veicolo e apri subito la selezione rapida ricambi consigliati"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvataggio...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Salva e Recupera Ricambi →</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
