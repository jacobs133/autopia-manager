import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Car,
  Check,
  Search,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Save,
  Globe,
  Store,
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
  resetRecommendedPartsCatalogToDefault,
  RecommendedCategoryGroup,
} from '../../services/recommendedPartsService';
import {
  createBatchDraftsFromVehicle,
  publishBatchDrafts,
  fetchVehicleDrafts,
  updateInventoryItem,
} from '../../services/partsService';
import { AlertBanner, Button, KpiCard, StatusBadge, uiClasses } from '../ui/DesignSystem';

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

  const [catalog, setCatalog] = useState<RecommendedCategoryGroup[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newPartName, setNewPartName] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState<boolean>(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<InventoryItem[]>([]);
  const [, setIsLoadingDrafts] = useState<boolean>(false);
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

  useEffect(() => {
    if (!isOpen) return;
    const cat = getRecommendedPartsCatalog();
    setCatalog(cat);
    setSearchQuery('');
    setGenerationError(null);
    setStatusMessage(null);

    setIsLoadingDrafts(true);
    fetchVehicleDrafts(sellerId, vehicle.id)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setDrafts(res.data);
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

  const handleAddPart = (categoryId: string) => {
    if (!newPartName.trim()) return;
    const updated = addPartToCategory(categoryId, newPartName.trim());
    setCatalog([...updated]);
    setNewPartName('');
    setAddingToCategory(null);
  };

  const handleSaveRename = (itemId: string) => {
    if (!editingItemName.trim()) return;
    const updated = updatePartName(itemId, editingItemName.trim());
    setCatalog([...updated]);
    setEditingItemId(null);
    setEditingItemName('');
  };

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

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const updated = addNewCategory(newCategoryName.trim());
    setCatalog([...updated]);
    setNewCategoryName('');
    setShowAddCategoryInput(false);
  };

  const handleResetCatalog = () => {
    if (!window.confirm('Ripristinare l\'elenco originale dei ricambi consigliati? Le personalizzazioni verranno azzerate.')) return;
    const def = resetRecommendedPartsCatalogToDefault();
    setCatalog([...def]);
    setSelectedItemIds(new Set());
  };

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

      setStep('review_drafts');
      setStatusMessage(`Create ${res.data.length} bozze ricambi. Imposta i prezzi e pubblica quelle pronte.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eccezione imprevista generazione bozze';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

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
      });

      if (res.data) {
        setDrafts((prev) => prev.map((d) => (d.id === res.data!.id ? res.data! : d)));
        setEditingDraft(null);
        setStatusMessage(`Bozza "${res.data.title}" aggiornata.`);
      }
    } catch (e: unknown) {
      console.error('Errore salvataggio bozza:', e);
    } finally {
      setIsSavingDraft(false);
    }
  };

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
        setStatusMessage(`Ricambio "${draft.title}" pubblicato online.`);
      }
    } catch (e) {
      console.error('Errore pubblicazione ricambio:', e);
    }
  };

  const handlePublishAllReady = async () => {
    const readyItems = drafts.filter((d) => d.status === 'inactive' && Number(d.price) > 0);
    if (readyItems.length === 0) {
      alert('Nessuna bozza ha un prezzo inserito. Completa i prezzi prima di pubblicare.');
      return;
    }

    if (!window.confirm(`Pubblicare online ${readyItems.length} annunci su Autopia Shop?`)) {
      return;
    }

    setIsPublishingBatch(true);
    setStatusMessage(null);

    try {
      const res = await publishBatchDrafts(
        sellerId,
        readyItems.map((d) => d.id)
      );

      const refreshed = await fetchVehicleDrafts(sellerId, vehicle.id);
      if (refreshed.data) {
        setDrafts(refreshed.data);
      }

      setStatusMessage(`Pubblicati ${res.successCount} annunci su Autopia Shop.`);
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
    <div className="fixed inset-0 z-50 bg-[#10201E]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans select-none">
      <div className="bg-white border border-[#E2E8E7] rounded-2xl w-full max-w-5xl my-4 overflow-hidden shadow-xl flex flex-col max-h-[92vh] text-[#1A2322]">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#E2E8E7] bg-[#FAFBFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF3F1] text-[#074E44] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A2322]">
                Recupero Ricambi da Veicolo
              </h2>
              <p className="text-xs text-[#5C6B68]">
                {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-[#E9EFEE] rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setStep('select_parts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  step === 'select_parts'
                    ? 'bg-white text-[#074E44] shadow-xs'
                    : 'text-[#5C6B68] hover:text-[#1A2322]'
                }`}
              >
                1. Selezione ({selectedPartsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStep('review_drafts')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  step === 'review_drafts'
                    ? 'bg-white text-[#074E44] shadow-xs'
                    : 'text-[#5C6B68] hover:text-[#1A2322]'
                }`}
              >
                <span>2. Revisione bozze</span>
                {drafts.length > 0 && (
                  <span className="font-mono tabular-nums text-[11px] opacity-80">({drafts.length})</span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#5C6B68] hover:text-[#1A2322] rounded-lg hover:bg-[#EDF2F1] transition-colors cursor-pointer"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIEPILOGO VEICOLO */}
        <div className="px-6 py-2.5 bg-[#F7FAF9] border-b border-[#E2E8E7] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#374845]">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#1A2322]">
              <Car className="w-3.5 h-3.5 text-[#074E44]" />
              <span>{vehicle.make} {vehicle.model}</span>
            </span>
            {vehicle.version && <span>· {vehicle.version}</span>}
            {vehicle.engine && <span>· Motore <code className="font-mono font-semibold text-[#1A2322]">{vehicle.engine}</code></span>}
            {vehicle.fuel_type && <span>· {vehicle.fuel_type}</span>}
            {vehicle.plate && <span>· Targa <strong className="font-mono text-[#074E44]">{vehicle.plate}</strong></span>}
          </div>
          <span className="text-[11px] text-[#5C6B68]">
            Compatibilità incluse automaticamente
          </span>
        </div>

        {(generationError || statusMessage) && (
          <div className="px-6 pt-4 space-y-2">
            {generationError && <AlertBanner tone="danger">{generationError}</AlertBanner>}
            {statusMessage && (
              <AlertBanner tone="success" onDismiss={() => setStatusMessage(null)}>
                {statusMessage}
              </AlertBanner>
            )}
          </div>
        )}

        {/* CORPO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'select_parts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7B8B88]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca ricambio (es. paraurti, alternatore, faro)..."
                    className={`${uiClasses.input} pl-9 pr-8`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[#7B8B88] hover:text-[#1A2322] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="xs" onClick={selectAll}>
                    Seleziona tutti
                  </Button>
                  <Button variant="ghost" size="xs" onClick={deselectAll}>
                    Deseleziona
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuova categoria</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleResetCatalog}
                    title="Ripristina lista predefinita"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {showAddCategoryInput && (
                <div className="p-3 bg-[#F7FAF9] border border-[#C6DFDA] rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome nuova categoria (es. Scarico, Cristalli)..."
                    className={`${uiClasses.input} flex-1`}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                  />
                  <Button variant="primary" size="xs" onClick={handleAddNewCategory}>
                    Crea
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setShowAddCategoryInput(false)}>
                    Annulla
                  </Button>
                </div>
              )}

              <div className="space-y-3.5">
                {filteredCatalog.map((group) => {
                  const isCollapsed = collapsedCategories.has(group.id);
                  const selectedInGroupCount = group.items.filter((it) => selectedItemIds.has(it.id)).length;
                  const isAdding = addingToCategory === group.id;

                  return (
                    <div
                      key={group.id}
                      className="bg-white border border-[#E2E8E7] rounded-xl overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-[#FAFBFB] flex items-center justify-between border-b border-[#E2E8E7]">
                        <button
                          type="button"
                          onClick={() => toggleCategoryCollapse(group.id)}
                          className="flex items-center gap-2 cursor-pointer text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-[#5C6B68]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#5C6B68]" />
                          )}
                          <span className="font-bold text-[#1A2322] text-sm">{group.categoryName}</span>
                          <span className="text-xs text-[#5C6B68] font-mono tabular-nums">
                            ({selectedInGroupCount}/{group.items.length})
                          </span>
                        </button>

                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => selectAllInCategory(group)}
                            className="text-[#074E44] font-semibold hover:underline cursor-pointer"
                          >
                            Tutti
                          </button>
                          <span className="text-[#C5D0CE]">·</span>
                          <button
                            type="button"
                            onClick={() => deselectAllInCategory(group)}
                            className="text-[#5C6B68] hover:underline cursor-pointer"
                          >
                            Nessuno
                          </button>
                          <span className="text-[#C5D0CE]">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingToCategory(group.id);
                              setNewPartName('');
                            }}
                            className="text-[#074E44] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Aggiungi</span>
                          </button>
                        </div>
                      </div>

                      {isAdding && (
                        <div className="p-3 bg-[#F7FAF9] border-b border-[#E2E8E7] flex items-center gap-2">
                          <input
                            type="text"
                            value={newPartName}
                            onChange={(e) => setNewPartName(e.target.value)}
                            placeholder={`Nuovo ricambio in ${group.categoryName}...`}
                            className={`${uiClasses.input} flex-1`}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPart(group.id)}
                          />
                          <Button variant="primary" size="xs" onClick={() => handleAddPart(group.id)}>
                            Aggiungi
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => setAddingToCategory(null)}>
                            Annulla
                          </Button>
                        </div>
                      )}

                      {!isCollapsed && (
                        <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {group.items.map((item) => {
                            const isSelected = selectedItemIds.has(item.id);
                            const isEditingThis = editingItemId === item.id;

                            if (isEditingThis) {
                              return (
                                <div
                                  key={item.id}
                                  className="p-2 bg-[#F7FAF9] rounded-lg border border-[#074E44] flex items-center gap-1.5 text-xs"
                                >
                                  <input
                                    type="text"
                                    value={editingItemName}
                                    onChange={(e) => setEditingItemName(e.target.value)}
                                    className="flex-1 bg-white border border-[#D7E0DE] rounded px-2 py-1 text-xs text-[#1A2322] focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(item.id)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRename(item.id)}
                                    className="p-1 text-[#074E44] hover:bg-[#EAF3F1] rounded cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1 text-[#5C6B68] hover:bg-[#EDF2F1] rounded cursor-pointer"
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
                                className={`group p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-[#EAF3F1] border-[#074E44] text-[#074E44] font-semibold'
                                    : 'bg-white hover:bg-[#F7FAF9] border-[#E2E8E7] text-[#1A2322]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                      isSelected
                                        ? 'bg-[#074E44] border-[#074E44] text-white'
                                        : 'border-[#C5D0CE] bg-white'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{item.name}</span>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItemId(item.id);
                                      setEditingItemName(item.name);
                                    }}
                                    className="p-1 text-[#5C6B68] hover:text-[#1A2322] rounded hover:bg-black/5 cursor-pointer"
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
                                    className="p-1 text-[#5C6B68] hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
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

          {step === 'review_drafts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiCard
                  label="Bozze incomplete"
                  value={incompleteCount}
                  hint="Prezzo o dettagli da completare"
                  accent="warning"
                  icon={<Clock className="w-4 h-4" />}
                />
                <KpiCard
                  label="Pronte da pubblicare"
                  value={readyCount}
                  hint="Prezzo definito"
                  accent="brand"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                />
                <KpiCard
                  label="Pubblicati online"
                  value={publishedCount}
                  hint="Visibili su Autopia Shop"
                  accent="success"
                  icon={<Store className="w-4 h-4" />}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8E7]">
                <div className="text-xs text-[#5C6B68]">
                  Bozze generate ({drafts.length}). Completa prezzo e dettagli prima di pubblicare.
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isPublishingBatch}
                    onClick={handlePublishAllReady}
                    disabled={isPublishingBatch || readyCount === 0}
                  >
                    {!isPublishingBatch && <Globe className="w-3.5 h-3.5" />}
                    <span>Pubblica pronte ({readyCount})</span>
                  </Button>

                  <Button variant="secondary" size="sm" onClick={() => setStep('select_parts')}>
                    + Aggiungi altri ricambi
                  </Button>
                </div>
              </div>

              {drafts.length === 0 ? (
                <div className="p-8 text-center bg-[#F7FAF9] rounded-xl border border-[#E2E8E7] text-[#5C6B68] text-xs">
                  Nessuna bozza generata per questo veicolo. Torna allo Step 1 per selezionare i ricambi.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {drafts.map((draft) => {
                    const isDraftIncomplete = draft.status === 'inactive' && (!draft.price || draft.price <= 0);
                    const isDraftReady = draft.status === 'inactive' && Number(draft.price) > 0;
                    const isPublished = draft.status === 'available';

                    return (
                      <div
                        key={draft.id}
                        className="p-4 bg-white rounded-xl border border-[#E2E8E7] flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isDraftIncomplete && <StatusBadge tone="warning">Prezzo mancante</StatusBadge>}
                            {isDraftReady && <StatusBadge tone="info">Pronta</StatusBadge>}
                            {isPublished && <StatusBadge tone="success">Online</StatusBadge>}
                            {draft.side && (
                              <span className="text-[11px] text-[#5C6B68]">Lato: {draft.side}</span>
                            )}
                          </div>

                          <div className="font-bold text-[#1A2322] text-sm">{draft.title}</div>
                          <p className="text-xs text-[#5C6B68] line-clamp-2">{draft.description}</p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C6B68] pt-1">
                            <span>
                              Prezzo:{' '}
                              <strong className={draft.price && draft.price > 0 ? 'text-[#074E44] tabular-nums' : 'text-amber-700'}>
                                {draft.price && draft.price > 0 ? `€ ${draft.price.toFixed(2)}` : 'Da inserire'}
                              </strong>
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">
                              Quantità: <strong className="text-[#1A2322]">{draft.quantity}</strong>
                            </span>
                            <span>·</span>
                            <span>
                              Condizione: <strong className="text-[#1A2322]">{draft.condition}</strong>
                            </span>
                            {draft.oem_code && (
                              <>
                                <span>·</span>
                                <span>
                                  OEM: <code className="font-mono text-[#1A2322]">{draft.oem_code}</code>
                                </span>
                              </>
                            )}
                            {draft.position_note && (
                              <>
                                <span>·</span>
                                <span>Scaffale: {draft.position_note}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="secondary" size="xs" onClick={() => openEditDraft(draft)}>
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Modifica e prezzo</span>
                          </Button>

                          {!isPublished ? (
                            <Button
                              variant={isDraftReady ? 'primary' : 'secondary'}
                              size="xs"
                              onClick={() => handlePublishSingle(draft)}
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>Pubblica</span>
                            </Button>
                          ) : (
                            <StatusBadge tone="success">
                              <Check className="w-3 h-3" />
                              <span>Attivo</span>
                            </StatusBadge>
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

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-[#E2E8E7] bg-[#FAFBFB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#5C6B68]">
            {step === 'select_parts' ? (
              <span>
                <strong className="text-[#074E44] tabular-nums">{selectedPartsList.length}</strong> ricambi selezionati per la creazione bozze.
              </span>
            ) : (
              <span>
                Le bozze salvate restano sempre disponibili in <strong>Magazzino Ricambi</strong>.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {step === 'select_parts' ? (
              <>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Chiudi
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  loading={isGenerating}
                  onClick={handleGenerateDrafts}
                  disabled={isGenerating || selectedPartsList.length === 0}
                >
                  {!isGenerating && <Sparkles className="w-3.5 h-3.5" />}
                  <span>
                    {isGenerating ? 'Creazione bozze...' : `Carica ricambi (${selectedPartsList.length})`}
                  </span>
                  {!isGenerating && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={onClose}>
                Salva e chiudi
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* MODALE EDIT SINGOLA BOZZA */}
      {editingDraft && (
        <div className="fixed inset-0 z-60 bg-[#10201E]/55 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDraft}
            className="bg-white border border-[#E2E8E7] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-[#1A2322] font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8E7] pb-3">
              <div>
                <span className="text-[11px] font-semibold text-[#074E44]">Modifica bozza ricambio</span>
                <h3 className="text-base font-bold text-[#1A2322]">{editingDraft.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="text-[#5C6B68] hover:text-[#1A2322] p-1 rounded-lg hover:bg-[#EDF2F1] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={uiClasses.label}>Prezzo di vendita (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={draftEditForm.price}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, price: e.target.value })}
                    placeholder="Es. 45.00"
                    className={`${uiClasses.input} font-bold tabular-nums`}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className={uiClasses.label}>Quantità disponibile</label>
                  <input
                    type="number"
                    min="1"
                    value={draftEditForm.quantity}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, quantity: e.target.value })}
                    className={`${uiClasses.input} tabular-nums`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={uiClasses.label}>Condizione</label>
                  <select
                    value={draftEditForm.condition}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, condition: e.target.value as PartCondition })}
                    className={uiClasses.select}
                  >
                    {PART_CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={uiClasses.label}>Lato / Posizione</label>
                  <select
                    value={draftEditForm.side}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, side: e.target.value })}
                    className={uiClasses.select}
                  >
                    <option value="">Non specificato</option>
                    {SIDES_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={uiClasses.label}>Codice OEM</label>
                  <input
                    type="text"
                    value={draftEditForm.oem_code}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, oem_code: e.target.value })}
                    placeholder="Es. 5G0807217"
                    className={`${uiClasses.input} font-mono`}
                  />
                </div>

                <div>
                  <label className={uiClasses.label}>Posizione magazzino</label>
                  <input
                    type="text"
                    value={draftEditForm.position_note}
                    onChange={(e) => setDraftEditForm({ ...draftEditForm, position_note: e.target.value })}
                    placeholder="Es. Corsia B - Scaffale 3"
                    className={uiClasses.input}
                  />
                </div>
              </div>

              <div>
                <label className={uiClasses.label}>Descrizione</label>
                <textarea
                  rows={3}
                  value={draftEditForm.description}
                  onChange={(e) => setDraftEditForm({ ...draftEditForm, description: e.target.value })}
                  className={uiClasses.textarea}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8E7]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditingDraft(null)}>
                Annulla
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSavingDraft} disabled={isSavingDraft}>
                {!isSavingDraft && <Save className="w-3.5 h-3.5" />}
                <span>Salva modifiche</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
