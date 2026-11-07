import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Car,
  Check,
  CheckSquare,
  Square,
  Search,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RotateCcw,
  DollarSign,
  Hash,
  MapPin,
  Tag,
  Save,
  Globe,
  Store,
  ExternalLink,
} from 'lucide-react';
import type { SellerVehicle } from '../../types/vehicles';
import type { InventoryItem, PartCondition } from '../../types/inventory';
import { PART_CONDITIONS, SIDES_OPTIONS } from '../../types/inventory';
import {
  getRecommendedPartsCatalog,
  addPartToCategory,
  updatePartName,
  removePartFromCategory,
  addNewCategory,
  removeCategory,
  resetRecommendedPartsCatalogToDefault,
  RecommendedCategoryGroup,
} from '../../services/recommendedPartsService';
import {
  createBatchDraftsFromVehicle,
  publishBatchDrafts,
  fetchVehicleDrafts,
  updateInventoryItem,
} from '../../services/partsService';

interface VehiclePartsExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  vehicle: SellerVehicle;
  onDraftsGenerated?: (items: InventoryItem[]) => void;
  onComplete?: () => void;
}

type Step = 'select_parts' | 'review_drafts';

export const VehiclePartsExtractorModal: React.FC<VehiclePartsExtractorModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  vehicle,
  onDraftsGenerated,
}) => {
  const [step, setStep] = useState<Step>('select_parts');

  // Catalogo categorie e ricambi consigliati (persistente in localStorage)
  const [catalog, setCatalog] = useState<RecommendedCategoryGroup[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Accordion categorie aperte
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Aggiunta nuova voce personalizzata
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newPartName, setNewPartName] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState<boolean>(false);

  // Modifica nome voce
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');

  // Stato caricamento e generazione
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Stato Step 2: Bozze generate
  const [drafts, setDrafts] = useState<InventoryItem[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState<boolean>(false);
  const [editingDraft, setEditingDraft] = useState<InventoryItem | null>(null);
  const [draftEditForm, setDraftEditForm] = useState<{
    price: string;
    quantity: string;
    condition: PartCondition;
    oem_code: string;
    internal_code: string;
    position_note: string;
    side: string;
    description: string;
  }>({
    price: '',
    quantity: '1',
    condition: 'buono',
    oem_code: '',
    internal_code: '',
    position_note: '',
    side: '',
    description: '',
  });
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isPublishingBatch, setIsPublishingBatch] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Caricamento iniziale catalogo consigliato
  useEffect(() => {
    if (!isOpen) return;
    const cat = getRecommendedPartsCatalog();
    setCatalog(cat);
    setSearchQuery('');
    setGenerationError(null);
    setStatusMessage(null);

    // Controlla se esistono già bozze per questo veicolo
    setIsLoadingDrafts(true);
    fetchVehicleDrafts(sellerId, vehicle.id)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setDrafts(res.data);
          // Se esistono già bozze, l'utente può scegliere tra selezionare altri ricambi o rivedere le bozze
        }
      })
      .finally(() => {
        setIsLoadingDrafts(false);
      });
  }, [isOpen, sellerId, vehicle.id]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAllInCategory = (group: RecommendedCategoryGroup) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      group.items.forEach((it) => next.add(it.id));
      return next;
    });
  };

  const deselectAllInCategory = (group: RecommendedCategoryGroup) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      group.items.forEach((it) => next.delete(it.id));
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set<string>();
    catalog.forEach((cat) => cat.items.forEach((it) => next.add(it.id)));
    setSelectedItemIds(next);
  };

  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Aggiunta voce a una categoria
  const handleAddPart = (categoryId: string) => {
    if (!newPartName.trim()) return;
    const updated = addPartToCategory(categoryId, newPartName.trim());
    setCatalog([...updated]);
    setNewPartName('');
    setAddingToCategory(null);
  };

  // Salvataggio rinomina voce
  const handleSaveRename = (itemId: string) => {
    if (!editingItemName.trim()) return;
    const updated = updatePartName(itemId, editingItemName.trim());
    setCatalog([...updated]);
    setEditingItemId(null);
    setEditingItemName('');
  };

  // Rimozione voce
  const handleDeletePart = (itemId: string) => {
    if (!window.confirm('Rimuovere questo ricambio dall\'elenco consigliato?')) return;
    const updated = removePartFromCategory(itemId);
    setCatalog([...updated]);
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Aggiunta nuova categoria
  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const updated = addNewCategory(newCategoryName.trim());
    setCatalog([...updated]);
    setNewCategoryName('');
    setShowAddCategoryInput(false);
  };

  // Ripristino elenco predefinito
  const handleResetCatalog = () => {
    if (!window.confirm('Ripristinare l\'elenco originale di fabbrica dei ricambi consigliati? Le modifiche personalizzate verranno azzerate.')) return;
    const def = resetRecommendedPartsCatalogToDefault();
    setCatalog([...def]);
    setSelectedItemIds(new Set());
  };

  // Calcolo ricambi filtrati dalla barra di ricerca
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const q = searchQuery.toLowerCase().trim();
    return catalog
      .map((group) => {
        const matchesCategory = group.categoryName.toLowerCase().includes(q);
        const matchedItems = group.items.filter(
          (it) => it.name.toLowerCase().includes(q) || matchesCategory
        );
        return {
          ...group,
          items: matchedItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [catalog, searchQuery]);

  // Conta totale ricambi selezionati
  const selectedPartsList = useMemo(() => {
    const list: { id: string; name: string; category: string; defaultSide?: string }[] = [];
    catalog.forEach((cat) => {
      cat.items.forEach((it) => {
        if (selectedItemIds.has(it.id)) {
          list.push({
            id: it.id,
            name: it.name,
            category: cat.categoryName,
            defaultSide: it.defaultSide,
          });
        }
      });
    });
    return list;
  }, [catalog, selectedItemIds]);

  // Generazione Massiva Bozze ("CARICA RICAMBI")
  const handleGenerateDrafts = async () => {
    if (selectedPartsList.length === 0) {
      setGenerationError('Seleziona almeno un ricambio da caricare per questo veicolo.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await createBatchDraftsFromVehicle({
        sellerId,
        sellerVehicle: vehicle,
        selectedParts: selectedPartsList.map((p) => ({
          name: p.name,
          category: p.category,
          defaultSide: p.defaultSide,
        })),
      });

      if (res.error && res.count === 0) {
        setGenerationError(res.error || 'Errore durante la creazione delle bozze.');
        setIsGenerating(false);
        return;
      }

      setDrafts(res.data);
      if (onDraftsGenerated) {
        onDraftsGenerated(res.data);
      }

      // Passa automaticamente alla schermata di revisione delle bozze
      setStep('review_drafts');
      setStatusMessage(`Create con successo ${res.data.length} bozze ricambi! Ora puoi completare i prezzi e confermarle.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eccezione imprevista generazione bozze';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Apertura form di modifica singola bozza
  const openEditDraft = (draft: InventoryItem) => {
    setEditingDraft(draft);
    setDraftEditForm({
      price: draft.price && draft.price > 0 ? String(draft.price) : '',
      quantity: draft.quantity ? String(draft.quantity) : '1',
      condition: draft.condition || 'buono',
      oem_code: draft.oem_code || '',
      internal_code: draft.internal_code || '',
      position_note: draft.position_note || '',
      side: draft.side || '',
      description: draft.description || '',
    });
  };

  // Salvataggio modifiche su una singola bozza
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;

    setIsSavingDraft(true);
    const numPrice = parseFloat(draftEditForm.price) || 0;
    const numQty = parseInt(draftEditForm.quantity, 10) || 1;

    try {
      const res = await updateInventoryItem(sellerId, editingDraft.id, {
        price: numPrice,
        quantity: numQty,
        condition: draftEditForm.condition,
        oem_code: draftEditForm.oem_code.trim() || null,
        internal_code: draftEditForm.internal_code.trim() || null,
        position_note: draftEditForm.position_note.trim() || null,
        side: draftEditForm.side || null,
        description: draftEditForm.description.trim() || null,
        // Lo stato rimane 'inactive' a meno che non venga pubblicato esplicitamente
      });

      if (res.data) {
        setDrafts((prev) => prev.map((d) => (d.id === res.data!.id ? res.data! : d)));
        setEditingDraft(null);
        setStatusMessage(`Bozza per "${res.data.title}" aggiornata.`);
      }
    } catch (e: unknown) {
      console.error('Errore salvataggio bozza:', e);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Pubblicazione singola bozza
  const handlePublishSingle = async (draft: InventoryItem) => {
    if (!draft.price || draft.price <= 0) {
      alert('Imposta un prezzo di vendita valido prima di pubblicare online.');
      openEditDraft(draft);
      return;
    }

    try {
      const res = await updateInventoryItem(sellerId, draft.id, {
        status: 'available',
      });
      if (res.data) {
        setDrafts((prev) => prev.map((d) => (d.id === res.data!.id ? res.data! : d)));
        setStatusMessage(`Ricambio "${draft.title}" pubblicato online con successo!`);
      }
    } catch (e) {
      console.error('Errore pubblicazione ricambio:', e);
    }
  };

  // Pubblicazione massiva di tutte le bozze pronte (con prezzo > 0)
  const handlePublishAllReady = async () => {
    const readyItems = drafts.filter((d) => d.status === 'inactive' && Number(d.price) > 0);
    if (readyItems.length === 0) {
      alert('Nessuna bozza ha un prezzo di vendita inserito. Completa i prezzi prima di pubblicare.');
      return;
    }

    if (!window.confirm(`Pubblicare online ${readyItems.length} annunci con prezzo completato su Autopia Shop?`)) {
      return;
    }

    setIsPublishingBatch(true);
    setStatusMessage(null);

    try {
      const res = await publishBatchDrafts(
        sellerId,
        readyItems.map((d) => d.id)
      );

      // Ricarica le bozze aggiornate
      const refreshed = await fetchVehicleDrafts(sellerId, vehicle.id);
      if (refreshed.data) {
        setDrafts(refreshed.data);
      }

      setStatusMessage(`Pubblicati con successo ${res.successCount} annunci su Autopia Shop!`);
    } catch (e: unknown) {
      console.error('Errore pubblicazione massiva:', e);
    } finally {
      setIsPublishingBatch(false);
    }
  };

  if (!isOpen) return null;

  const incompleteCount = drafts.filter((d) => d.status === 'inactive' && (!d.price || d.price <= 0)).length;
  const readyCount = drafts.filter((d) => d.status === 'inactive' && Number(d.price) > 0).length;
  const publishedCount = drafts.filter((d) => d.status === 'available').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl my-4 overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER MODALE */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Caricamento Multiplo Ricambi
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {vehicle.make} {vehicle.model} ({vehicle.year || 'Anno N.D.'})
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-0.5 flex items-center space-x-2">
                <span>Recupero Ricambi da Veicolo Demolito</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Selettore Step */}
            <div className="hidden sm:flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setStep('select_parts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  step === 'select_parts'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Selezione Ricambi ({selectedPartsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStep('review_drafts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  step === 'review_drafts'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>2. Revisione Bozze</span>
                {drafts.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                    {drafts.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCHEDA INFORMATIVA VEICOLO */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <Car className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300">
              <span className="font-bold text-slate-100">{vehicle.make} {vehicle.model}</span>
              {vehicle.version && <span className="text-slate-400">• {vehicle.version}</span>}
              {vehicle.engine && <span>• Motore: <code className="text-amber-300 font-mono">{vehicle.engine}</code></span>}
              {vehicle.fuel_type && <span>• {vehicle.fuel_type}</span>}
              {vehicle.power && <span>• {vehicle.power}</span>}
              {vehicle.plate && <span>• Targa: <strong className="font-mono text-emerald-400">{vehicle.plate}</strong></span>}
              {vehicle.vin && <span>• Telaio: <span className="font-mono text-slate-400 text-[11px]">{vehicle.vin}</span></span>}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            I dati del veicolo saranno inclusi nelle descrizioni e nella compatibilità.
          </div>
        </div>

        {/* NOTIFICHE & ERRORI */}
        {generationError && (
          <div className="mx-6 mt-4 p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        {statusMessage && (
          <div className="mx-6 mt-4 p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-xs text-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* CORPO PRINCIPALE A DUE STEP */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================================================= */}
          {/* STEP 1: SELEZIONE RICAMBI CONSIGLIATI                                     */}
          {/* ========================================================================= */}
          {step === 'select_parts' && (
            <div className="space-y-5">
              {/* Toolbar di Ricerca e Selezione Rapida */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca ricambio (es. paraurti, alternatore, faro)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Seleziona Tutti
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg transition-colors cursor-pointer"
                  >
                    Deseleziona
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuova Categoria</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCatalog}
                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Ripristina lista di fabbrica"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Input Creazione Categoria */}
              {showAddCategoryInput && (
                <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center space-x-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome nuova categoria (es. Impianto di Scarico, Cristalli)..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Crea
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInput(false)}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              )}

              {/* Elenco Categorie con Checkbox */}
              <div className="space-y-4">
                {filteredCatalog.map((group) => {
                  const isCollapsed = collapsedCategories.has(group.id);
                  const selectedInGroupCount = group.items.filter((it) => selectedItemIds.has(it.id)).length;
                  const isAdding = addingToCategory === group.id;

                  return (
                    <div
                      key={group.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden transition-colors"
                    >
                      {/* Header Categoria */}
                      <div className="px-4 py-3 bg-slate-950 flex items-center justify-between border-b border-slate-800/60">
                        <div
                          onClick={() => toggleCategoryCollapse(group.id)}
                          className="flex items-center space-x-2.5 cursor-pointer select-none"
                        >
                          <button type="button" className="text-slate-400">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="font-bold text-slate-200 text-sm">{group.categoryName}</span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({selectedInGroupCount}/{group.items.length} selezionati)
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-xs">
                          <button
                            type="button"
                            onClick={() => selectAllInCategory(group)}
                            className="text-amber-400 hover:underline cursor-pointer"
                          >
                            Tutti
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => deselectAllInCategory(group)}
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Nessuno
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingToCategory(group.id);
                              setNewPartName('');
                            }}
                            className="text-slate-300 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Aggiungi Voce</span>
                          </button>
                        </div>
                      </div>

                      {/* Input per nuova voce nella categoria */}
                      {isAdding && (
                        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center space-x-2 animate-in fade-in duration-150">
                          <input
                            type="text"
                            value={newPartName}
                            onChange={(e) => setNewPartName(e.target.value)}
                            placeholder={`Nuovo ricambio per ${group.categoryName}...`}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPart(group.id)}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPart(group.id)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                          >
                            Aggiungi
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingToCategory(null)}
                            className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                          >
                            Annulla
                          </button>
                        </div>
                      )}

                      {/* Griglia Ricambi della Categoria */}
                      {!isCollapsed && (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {group.items.map((item) => {
                            const isSelected = selectedItemIds.has(item.id);
                            const isEditingThis = editingItemId === item.id;

                            if (isEditingThis) {
                              return (
                                <div
                                  key={item.id}
                                  className="p-2 bg-slate-900 rounded-lg border border-amber-500/40 flex items-center space-x-1 text-xs"
                                >
                                  <input
                                    type="text"
                                    value={editingItemName}
                                    onChange={(e) => setEditingItemName(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(item.id)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRename(item.id)}
                                    className="p-1 text-emerald-400 hover:text-emerald-300"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1 text-slate-400 hover:text-slate-200"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleItemSelection(item.id)}
                                className={`group p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-sm'
                                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:text-slate-100'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                      isSelected
                                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                                        : 'border-slate-700 bg-slate-950'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="font-medium truncate">{item.name}</span>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItemId(item.id);
                                      setEditingItemName(item.name);
                                    }}
                                    className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800"
                                    title="Rinomina"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePart(item.id);
                                    }}
                                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800"
                                    title="Rimuovi"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: REVISIONE E CONFERMA BOZZE GENERATE                               */}
          {/* ========================================================================= */}
          {step === 'review_drafts' && (
            <div className="space-y-5">
              {/* Riepilogo contatori bozze */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Bozze Incomplete
                    </div>
                    <div className="text-xl font-bold text-amber-300 mt-0.5">{incompleteCount}</div>
                    <div className="text-[11px] text-slate-400">Prezzo o dettagli da inserire</div>
                  </div>
                  <Clock className="w-6 h-6 text-amber-400/60" />
                </div>

                <div className="p-3 bg-blue-950/30 border border-blue-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                      Pronte per la Pubblicazione
                    </div>
                    <div className="text-xl font-bold text-blue-300 mt-0.5">{readyCount}</div>
                    <div className="text-[11px] text-slate-400">Prezzo definito, pronte per online</div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-blue-400/60" />
                </div>

                <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Pubblicati Online
                    </div>
                    <div className="text-xl font-bold text-emerald-300 mt-0.5">{publishedCount}</div>
                    <div className="text-[11px] text-slate-400">Visibili su Autopia Shop</div>
                  </div>
                  <Store className="w-6 h-6 text-emerald-400/60" />
                </div>
              </div>

              {/* Barra Azioni Bozze */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div className="text-xs text-slate-400">
                  Elenco delle bozze generate ({drafts.length} ricambi). Modifica i dettagli e stabilisci i prezzi prima di confermare.
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handlePublishAllReady}
                    disabled={isPublishingBatch || readyCount === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    {isPublishingBatch ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    <span>Pubblica Tutte le Bozze Pronte ({readyCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('select_parts')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    + Seleziona Altri Ricambi
                  </button>
                </div>
              </div>

              {/* Elenco Bozze con Indicatori Visivi di Stato */}
              {drafts.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Nessuna bozza generata per questo veicolo. Torna allo Step 1 per selezionare i ricambi e generare le bozze.
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => {
                    const isDraftIncomplete = draft.status === 'inactive' && (!draft.price || draft.price <= 0);
                    const isDraftReady = draft.status === 'inactive' && Number(draft.price) > 0;
                    const isPublished = draft.status === 'available';

                    return (
                      <div
                        key={draft.id}
                        className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Indicatore Visivo di Stato */}
                            {isDraftIncomplete && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Bozza Incompleta</span>
                              </span>
                            )}
                            {isDraftReady && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                <span>Pronta per Pubblicazione</span>
                              </span>
                            )}
                            {isPublished && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                                <Store className="w-3 h-3 text-emerald-400" />
                                <span>Pubblicato Online</span>
                              </span>
                            )}

                            <span className="text-[11px] font-mono text-slate-500">
                              ID: {draft.id.slice(0, 8)}...
                            </span>
                            {draft.side && (
                              <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Lato: {draft.side}
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-slate-100 text-sm">{draft.title}</div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {draft.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                            <span>Prezzo: <strong className={draft.price && draft.price > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                              {draft.price && draft.price > 0 ? `€ ${draft.price.toFixed(2)}` : 'Da inserire (€ 0.00)'}
                            </strong></span>
                            <span>Giacenza: <strong className="text-slate-200">{draft.quantity} pz</strong></span>
                            <span>Condizione: <strong className="text-slate-200">{draft.condition}</strong></span>
                            {draft.oem_code && <span>OEM: <code className="text-slate-300 font-mono">{draft.oem_code}</code></span>}
                            {draft.position_note && <span>Scaffale: <span className="text-amber-300">{draft.position_note}</span></span>}
                          </div>
                        </div>

                        {/* Pulsanti Azione per singola bozza */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditDraft(draft)}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Modifica & Prezzo</span>
                          </button>

                          {!isPublished ? (
                            <button
                              type="button"
                              onClick={() => handlePublishSingle(draft)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                                isDraftReady
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                              title={isDraftReady ? 'Pubblica subito questo ricambio online' : 'Inserisci prima il prezzo per pubblicare'}
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Pubblica</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-400 font-semibold px-2 py-1 flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Attivo</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER MODALE */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {step === 'select_parts' ? (
              <span>
                Selezionati <strong className="text-amber-400">{selectedPartsList.length}</strong> ricambi. Clicca su <strong>"Carica Ricambi"</strong> per generare le bozze con descrizioni precompilate.
              </span>
            ) : (
              <span>
                Tutte le bozze sono salvate in modo persistente nel database di magazzino. Puoi completarle ora o ritrovarle in qualsiasi momento in <strong>"Magazzino & Ricambi"</strong>.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {step === 'select_parts' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Chiudi
                </button>

                <button
                  type="button"
                  onClick={handleGenerateDrafts}
                  disabled={isGenerating || selectedPartsList.length === 0}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-40"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generazione Bozze in Corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>CARICA RICAMBI ({selectedPartsList.length})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-md"
                >
                  Salva e Completa in Seguito
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* MODALE EDIT SINGOLA BOZZA */}
      {editingDraft && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDraft}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-100 font-sans"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-400">Modifica Dettagli Bozza</span>
                <h3 className="text-base font-bold text-slate-100">{editingDraft.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Prezzo di Vendita (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={draftEditForm.price}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, price: e.target.value })}
                    placeholder="es. 45.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Quantità Disponibile</label>
                  <input
                    type="number"
                    min="1"
                    value={draftEditForm.quantity}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Condizione Ricambio</label>
                  <select
                    value={draftEditForm.condition}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, condition: e.target.value as PartCondition })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    {PART_CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Lato / Posizione</label>
                  <select
                    value={draftEditForm.side}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, side: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Nessuno specificato</option>
                    {SIDES_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Codice OEM Originale</label>
                  <input
                    type="text"
                    value={draftEditForm.oem_code}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, oem_code: e.target.value })}
                    placeholder="es. 5G0807217"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Posizione Magazzino (Scaffale)</label>
                  <input
                    type="text"
                    value={draftEditForm.position_note}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, position_note: e.target.value })}
                    placeholder="es. Corsia B - Scaffale 3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Descrizione Dettagliata</label>
                <textarea
                  rows={3}
                  value={draftEditForm.description}
                  onChange={(e) => setDraftEditForm({ ...draftEditForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSavingDraft}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salva Modifiche</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
