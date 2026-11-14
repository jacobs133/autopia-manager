import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Car,
  Save,
  Loader2,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  Database as DatabaseIcon,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { SellerVehicle, CatalogVehicle, CatalogMakeInfo } from '../../types/vehicles';
import { VEHICLE_STATUS_OPTIONS } from '../../types/vehicles';
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
import { AlertBanner, Button, StatusBadge, uiClasses } from '../ui/DesignSystem';

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

  const [selectedCatalogVehicle, setSelectedCatalogVehicle] = useState<CatalogVehicle | null>(null);
  const [isLoadingCatalogItem, setIsLoadingCatalogItem] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState<'quick' | 'cascade'>('quick');

  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<CatalogVehicle[]>([]);
  const [isSearchingQuick, setIsSearchingQuick] = useState(false);
  const [quickSearchError, setQuickSearchError] = useState<string | null>(null);
  const [hasSearchedQuick, setHasSearchedQuick] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const [year, setYear] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('in_attesa');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [confirmYearMismatch, setConfirmYearMismatch] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);
    setCatalogLoadError(null);
    setConfirmYearMismatch(false);
    setVariantFilterTerm('');

    if (vehicleToEdit) {
      setYear(vehicleToEdit.year ? String(vehicleToEdit.year) : '');
      setPlate(vehicleToEdit.plate || '');
      setVin(vehicleToEdit.vin || '');
      setArrivalDate(vehicleToEdit.arrival_date || new Date().toISOString().split('T')[0]);
      setLocation(vehicleToEdit.location || '');
      setStatus(vehicleToEdit.status || 'in_attesa');
      setNotes(vehicleToEdit.notes || '');
      setPhotoUrl(vehicleToEdit.photo_url || '');

      const kmMatch = vehicleToEdit.notes?.match(/\[Km:\s*([^\]]+)\]/i);
      if (kmMatch) {
        setMileage(kmMatch[1].trim());
      } else {
        setMileage('');
      }

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

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    setSelectedGeneration('');
    setAvailableGenerations([]);
    setAvailableVariants([]);
    setCascadeError(null);

    if (!model || !selectedMake) return;

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

  const handleSelectVariant = (variant: CatalogVehicle) => {
    setSelectedCatalogVehicle(variant);
    setFormError(null);
    setConfirmYearMismatch(false);
  };

  const handleClearSelectedCatalog = () => {
    setSelectedCatalogVehicle(null);
    setConfirmYearMismatch(false);
  };

  const yearNumber = year ? Number(year) : null;
  const isYearMismatch = Boolean(
    selectedCatalogVehicle &&
      yearNumber &&
      ((selectedCatalogVehicle.year_from && yearNumber < selectedCatalogVehicle.year_from) ||
        (selectedCatalogVehicle.year_to && yearNumber > selectedCatalogVehicle.year_to))
  );

  const executeSubmit = async (andOpenPartsExtractor = false) => {
    setFormError(null);

    if (!selectedCatalogVehicle) {
      setFormError(
        'Seleziona prima un modello dal catalogo Autopia per procedere.'
      );
      return;
    }

    if (yearNumber && (isNaN(yearNumber) || yearNumber < 1950 || yearNumber > 2035)) {
      setFormError('Inserisci un anno di immatricolazione valido (tra 1950 e 2035).');
      return;
    }

    if (isYearMismatch && !confirmYearMismatch) {
      setFormError(
        `L'anno di immatricolazione (${yearNumber}) non rientra negli anni standard del modello (${selectedCatalogVehicle.year_from || '—'} - ${selectedCatalogVehicle.year_to || 'in corso'}). Conferma la casella dedicata per procedere.`
      );
      return;
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10201E]/45 backdrop-blur-[2px] select-none font-sans">
      <div className="w-full max-w-4xl bg-white border border-[#E2E8E7] rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Intestazione Modal */}
        <div className="px-6 py-4 bg-[#FAFBFB] border-b border-[#E2E8E7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3F1] text-[#074E44] flex items-center justify-center">
              <DatabaseIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A2322]">
                {isEditing ? 'Modifica Scheda Veicolo' : 'Registra Nuovo Veicolo'}
              </h2>
              <p className="text-xs text-[#5C6B68]">
                Abbina il veicolo al catalogo ufficiale Autopia e compila i dati dell'esemplare
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#5C6B68] hover:text-[#1A2322] hover:bg-[#EDF2F1] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Scrollabile */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {formError && (
            <AlertBanner tone="danger">{formError}</AlertBanner>
          )}

          {/* SEZIONE 1: SELEZIONE DEL MODELLO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#EEF2F1]">
              <div className="flex items-center gap-2 font-bold text-[#074E44] text-xs">
                <Car className="w-4 h-4" />
                <span>1. Modello dal Catalogo Autopia</span>
              </div>
              {selectedCatalogVehicle && (
                <StatusBadge tone="success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Modello collegato</span>
                </StatusBadge>
              )}
            </div>

            {isLoadingCatalogItem && (
              <div className="p-4 bg-[#F7FAF9] border border-[#E2E8E7] rounded-xl flex items-center justify-center gap-2 text-[#5C6B68]">
                <Loader2 className="w-4 h-4 animate-spin text-[#074E44]" />
                <span>Caricamento specifiche dal catalogo...</span>
              </div>
            )}

            {catalogLoadError && !isLoadingCatalogItem && (
              <AlertBanner tone="warning" title={catalogLoadError}>
                Seleziona una variante dal catalogo sottostante per associare o correggere il modello.
              </AlertBanner>
            )}

            {selectedCatalogVehicle && !isLoadingCatalogItem ? (
              <div className="bg-[#F7FAF9] border border-[#C6DFDA] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[#1A2322]">
                        {selectedCatalogVehicle.make} {selectedCatalogVehicle.model}
                      </span>
                      <StatusBadge tone="brand">Catalogo Autopia</StatusBadge>
                    </div>
                    <div className="text-xs text-[#074E44] font-medium">
                      {selectedCatalogVehicle.version || 'Versione standard'}
                      {selectedCatalogVehicle.generation ? ` · Serie ${selectedCatalogVehicle.generation}` : ''}
                    </div>
                  </div>

                  <Button type="button" variant="secondary" size="xs" onClick={handleClearSelectedCatalog}>
                    <RefreshCw className="w-3 h-3" />
                    <span>Cambia modello</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#E2E8E7] text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
                    <span className="text-[#5C6B68] block text-[11px]">Anni produzione</span>
                    <span className="text-[#1A2322] font-semibold font-mono tabular-nums">
                      {selectedCatalogVehicle.year_from || '—'} – {selectedCatalogVehicle.year_to || 'in corso'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
                    <span className="text-[#5C6B68] block text-[11px]">Alimentazione</span>
                    <span className="text-[#1A2322] font-semibold">{selectedCatalogVehicle.fuel_type || '—'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
                    <span className="text-[#5C6B68] block text-[11px]">Codice motore</span>
                    <span className="text-[#1A2322] font-semibold font-mono">{selectedCatalogVehicle.engine || '—'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
                    <span className="text-[#5C6B68] block text-[11px]">Potenza</span>
                    <span className="text-[#1A2322] font-semibold">{selectedCatalogVehicle.power || '—'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
                    <span className="text-[#5C6B68] block text-[11px]">Cambio</span>
                    <span className="text-[#1A2322] font-semibold">{selectedCatalogVehicle.transmission || '—'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#E2E8E7]">
                    <span className="text-[#5C6B68] block text-[11px]">Carrozzeria</span>
                    <span className="text-[#1A2322] font-semibold">
                      {selectedCatalogVehicle.body_style || '—'}{' '}
                      {selectedCatalogVehicle.doors ? `(${selectedCatalogVehicle.doors}p)` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#F7FAF9] border border-[#E2E8E7] rounded-xl p-4 space-y-4">
                <div className="inline-flex items-center gap-1 p-1 bg-[#E9EFEE] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSelectionMode('quick')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectionMode === 'quick'
                        ? 'bg-white text-[#074E44] shadow-xs'
                        : 'text-[#5C6B68] hover:text-[#1A2322]'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Ricerca rapida</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectionMode('cascade')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectionMode === 'cascade'
                        ? 'bg-white text-[#074E44] shadow-xs'
                        : 'text-[#5C6B68] hover:text-[#1A2322]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Selezione guidata</span>
                  </button>
                </div>

                {selectionMode === 'quick' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#7B8B88] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Digita marca, modello o versione (es. 'Fiat Panda 1.2', 'Golf 7 TDI')..."
                        value={quickSearchTerm}
                        onChange={(e) => handleQuickSearchChange(e.target.value)}
                        className={`${uiClasses.input} pl-9 pr-8`}
                      />
                      {isSearchingQuick && (
                        <Loader2 className="w-4 h-4 text-[#074E44] animate-spin absolute right-3 top-2.5" />
                      )}
                    </div>

                    {quickSearchError && (
                      <AlertBanner tone="danger">{quickSearchError}</AlertBanner>
                    )}

                    {hasSearchedQuick && !isSearchingQuick && quickSearchResults.length === 0 && !quickSearchError && (
                      <div className="p-4 bg-white border border-dashed border-[#D7E0DE] rounded-xl text-center text-[#5C6B68] text-xs">
                        Nessun modello trovato. Prova a cercare solo per marca o modello.
                      </div>
                    )}

                    {quickSearchResults.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-[#5C6B68] block">
                          Risultati trovati ({quickSearchResults.length})
                        </span>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {quickSearchResults.map((variant) => (
                            <div
                              key={variant.id}
                              onClick={() => handleSelectVariant(variant)}
                              className="p-2.5 bg-white hover:bg-[#EAF3F1]/50 border border-[#E2E8E7] hover:border-[#074E44]/50 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                            >
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-[#1A2322] text-xs group-hover:text-[#074E44]">
                                    {variant.make} {variant.model}
                                  </span>
                                  {variant.generation && (
                                    <span className="text-[11px] text-[#5C6B68]">[{variant.generation}]</span>
                                  )}
                                  <span className="text-[11px] font-mono tabular-nums text-[#5C6B68]">
                                    ({variant.year_from || '—'}–{variant.year_to || 'oggi'})
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#5C6B68] flex flex-wrap items-center gap-2">
                                  <span>{variant.version || 'Versione standard'}</span>
                                  {variant.engine && (
                                    <>
                                      <span>·</span>
                                      <span className="text-[#1A2322] font-mono">{variant.engine}</span>
                                    </>
                                  )}
                                  {variant.power && (
                                    <>
                                      <span>·</span>
                                      <span>{variant.power}</span>
                                    </>
                                  )}
                                  {variant.fuel_type && (
                                    <>
                                      <span>·</span>
                                      <span className="text-[#074E44] font-semibold">{variant.fuel_type}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <ChevronRight className="w-4 h-4 text-[#7B8B88] group-hover:text-[#074E44] shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectionMode === 'cascade' && (
                  <div className="space-y-4">
                    {cascadeError && <AlertBanner tone="danger">{cascadeError}</AlertBanner>}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={uiClasses.label}>1. Marca *</label>
                        <select
                          value={selectedMake}
                          onChange={(e) => handleMakeChange(e.target.value)}
                          disabled={isLoadingMakes}
                          className={uiClasses.select}
                        >
                          <option value="">
                            {isLoadingMakes
                              ? 'Caricamento marche...'
                              : availableMakes.length > 0
                              ? `Seleziona marca (${availableMakes.length})`
                              : 'Seleziona marca'}
                          </option>
                          {availableMakes.map((m) => {
                            const detail = makeDetails.find((d) => d.name === m);
                            return (
                              <option key={m} value={m}>
                                {m} {detail ? `(${detail.count})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className={uiClasses.label}>2. Modello *</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => handleModelChange(e.target.value)}
                          disabled={!selectedMake || isLoadingModels}
                          className={uiClasses.select}
                        >
                          <option value="">
                            {!selectedMake
                              ? 'Prima seleziona una marca'
                              : isLoadingModels
                              ? 'Caricamento modelli...'
                              : `Seleziona modello (${availableModels.length})`}
                          </option>
                          {availableModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={uiClasses.label}>3. Serie / Generazione</label>
                        <select
                          value={selectedGeneration}
                          onChange={(e) => handleGenerationChange(e.target.value)}
                          disabled={!selectedModel || isLoadingGenerations}
                          className={uiClasses.select}
                        >
                          <option value="">
                            {!selectedModel
                              ? 'Prima seleziona un modello'
                              : availableGenerations.length === 0
                              ? 'Tutte le serie'
                              : 'Tutte le serie'}
                          </option>
                          {availableGenerations.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedModel && (
                      <div className="space-y-2 pt-2 border-t border-[#E2E8E7]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#1A2322]">
                            4. Seleziona la variante ({availableVariants.length})
                          </span>
                          {isLoadingVariants && (
                            <span className="text-[#5C6B68] text-[11px] flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-[#074E44]" />
                              <span>Caricamento...</span>
                            </span>
                          )}
                        </div>

                        {availableVariants.length > 4 && (
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[#7B8B88] absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              placeholder="Filtra per motore, alimentazione o allestimento..."
                              value={variantFilterTerm}
                              onChange={(e) => setVariantFilterTerm(e.target.value)}
                              className={`${uiClasses.input} pl-8`}
                            />
                          </div>
                        )}

                        {!isLoadingVariants && availableVariants.length === 0 && (
                          <div className="p-3 bg-white rounded-lg border border-[#E2E8E7] text-[#5C6B68] text-center">
                            Nessuna variante trovata per questo modello.
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
                                className="p-2.5 bg-white hover:bg-[#EAF3F1]/50 border border-[#E2E8E7] hover:border-[#074E44]/50 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-[#1A2322] text-xs group-hover:text-[#074E44]">
                                      {variant.version || 'Allestimento base'}
                                    </span>
                                    {variant.generation && (
                                      <span className="text-[11px] text-[#5C6B68] font-mono">
                                        [{variant.generation}]
                                      </span>
                                    )}
                                    <span className="text-[11px] font-mono tabular-nums text-[#5C6B68]">
                                      ({variant.year_from || '—'}–{variant.year_to || 'in corso'})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#5C6B68] flex flex-wrap items-center gap-2">
                                    <span className="text-[#074E44] font-semibold">
                                      {variant.fuel_type || 'Standard'}
                                    </span>
                                    {variant.engine && (
                                      <>
                                        <span>·</span>
                                        <span className="text-[#1A2322] font-mono">{variant.engine}</span>
                                      </>
                                    )}
                                    {variant.power && (
                                      <>
                                        <span>·</span>
                                        <span>{variant.power}</span>
                                      </>
                                    )}
                                    {variant.transmission && (
                                      <>
                                        <span>·</span>
                                        <span>{variant.transmission}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 bg-[#EAF3F1] group-hover:bg-[#074E44] text-[#074E44] group-hover:text-white font-semibold rounded-md text-[11px] transition-colors shrink-0">
                                  Seleziona
                                </span>
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

          {/* SEZIONE 2: DATI ESEMPLARE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#074E44] text-xs pb-1.5 border-b border-[#EEF2F1]">
              <Tag className="w-4 h-4" />
              <span>2. Dati dell'esemplare</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={uiClasses.label}>Anno immatricolazione</label>
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
                  className={`${uiClasses.input} tabular-nums`}
                />
              </div>

              <div>
                <label className={uiClasses.label}>Chilometraggio (km)</label>
                <input
                  type="number"
                  placeholder="Es. 145000"
                  min="0"
                  max="2000000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className={`${uiClasses.input} tabular-nums`}
                />
              </div>

              <div>
                <label className={uiClasses.label}>Targa</label>
                <input
                  type="text"
                  placeholder="Es. AB123CD"
                  maxLength={10}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className={`${uiClasses.input} font-mono uppercase`}
                />
              </div>

              <div>
                <label className={uiClasses.label}>Numero di telaio (VIN)</label>
                <input
                  type="text"
                  placeholder="Es. WAUZZZ8K9DA123456"
                  maxLength={17}
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  className={`${uiClasses.input} font-mono uppercase`}
                />
              </div>
            </div>

            {isYearMismatch && selectedCatalogVehicle && (
              <AlertBanner tone="warning" title="Anno fuori dall'intervallo standard">
                <p>
                  L'anno inserito ({yearNumber}) differisce dal periodo standard ({selectedCatalogVehicle.year_from || '—'}–{selectedCatalogVehicle.year_to || 'oggi'}).
                </p>
                <label className="flex items-center gap-2 text-xs text-[#1A2322] cursor-pointer mt-2 font-medium">
                  <input
                    type="checkbox"
                    checked={confirmYearMismatch}
                    onChange={(e) => setConfirmYearMismatch(e.target.checked)}
                    className="rounded border-amber-500 text-[#074E44] focus:ring-[#074E44] cursor-pointer"
                  />
                  <span>Confermo comunque l'anno di immatricolazione inserito</span>
                </label>
              </AlertBanner>
            )}
          </div>

          {/* SEZIONE 3: PIAZZALE E STATO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#074E44] text-xs pb-1.5 border-b border-[#EEF2F1]">
              <MapPin className="w-4 h-4" />
              <span>3. Piazzale e stato lavorazione</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={uiClasses.label}>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#5C6B68]" />
                    <span>Data ingresso</span>
                  </span>
                </label>
                <input
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className={uiClasses.input}
                />
              </div>

              <div>
                <label className={uiClasses.label}>Posizione in piazzale</label>
                <input
                  type="text"
                  placeholder="Es. Piazzale Nord, Fila C4"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={uiClasses.input}
                />
              </div>

              <div>
                <label className={uiClasses.label}>Stato lavorazione</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={uiClasses.select}
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

          {/* SEZIONE 4: NOTE E FOTO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#074E44] text-xs pb-1.5 border-b border-[#EEF2F1]">
              <FileText className="w-4 h-4" />
              <span>4. Note e immagine</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={uiClasses.label}>URL fotografia (opzionale)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className={`${uiClasses.input} font-mono`}
                />
              </div>

              <div>
                <label className={uiClasses.label}>Note interne</label>
                <textarea
                  rows={2}
                  placeholder="Es. Esemplare completo lato anteriore, motore integro..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={uiClasses.textarea}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Azioni */}
        <div className="px-6 py-3.5 bg-[#FAFBFB] border-t border-[#E2E8E7] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs">
            {!selectedCatalogVehicle ? (
              <span className="text-amber-700 font-medium">
                Seleziona un modello dal catalogo per salvare
              </span>
            ) : (
              <span className="text-[#5C6B68]">
                Modello: <strong className="text-[#1A2322]">{selectedCatalogVehicle.make} {selectedCatalogVehicle.model}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Annulla
            </Button>

            {isEditing ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                onClick={() => executeSubmit(false)}
                disabled={isSubmitting || !selectedCatalogVehicle || (isYearMismatch && !confirmYearMismatch)}
              >
                {!isSubmitting && <Save className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Salvataggio...' : 'Aggiorna veicolo'}</span>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => executeSubmit(false)}
                  disabled={isSubmitting || !selectedCatalogVehicle || (isYearMismatch && !confirmYearMismatch)}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva veicolo</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={isSubmitting}
                  onClick={() => executeSubmit(true)}
                  disabled={isSubmitting || !selectedCatalogVehicle || (isYearMismatch && !confirmYearMismatch)}
                >
                  {!isSubmitting && <Sparkles className="w-3.5 h-3.5" />}
                  <span>Salva e recupera ricambi</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
