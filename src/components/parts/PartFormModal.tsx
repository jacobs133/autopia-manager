import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type {
  InventoryItem,
  PartCategory,
  PART_CONDITIONS,
  SIDES_OPTIONS,
} from '../../types/inventory';
import type { SellerVehicle } from '../../types/vehicles';
import {
  createInventoryItem,
  updateInventoryItem,
  fetchPartCategories,
} from '../../services/partsService';
import { fetchSellerVehicles } from '../../services/vehiclesService';

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
  const [price, setPrice] = useState<string>(itemToEdit ? String(itemToEdit.price) : '');
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
  const [status, setStatus] = useState<InventoryItem['status']>(itemToEdit?.status || 'available');

  const [selectedSellerVehicleId, setSelectedSellerVehicleId] = useState<string>(
    itemToEdit?.seller_vehicle_id || initialSellerVehicleId || ''
  );
  const [categoryId, setCategoryId] = useState<string>('');

  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [yardVehicles, setYardVehicles] = useState<SellerVehicle[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carica categorie e veicoli piazzale per il dropdown di associazione
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
            pageSize: 200,
          }),
        ]);

        if (isMounted) {
          if (catsRes.data) setCategories(catsRes.data);
          if (vehsRes.data) setYardVehicles(vehsRes.data);
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
  }, [sellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Inserisci il nome o la descrizione del ricambio');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMessage('Inserisci un prezzo valido (es. 45.00)');
      return;
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty < 1) {
      setErrorMessage('La quantità deve essere di almeno 1 pezzo');
      return;
    }

    const numShipping = shippingAvailable ? parseFloat(shippingCost) || 0 : null;

    setIsSubmitting(true);

    try {
      if (isEditing && itemToEdit) {
        const res = await updateInventoryItem(sellerId, itemToEdit.id, {
          title: title.trim(),
          oem_code: oemCode.trim() || null,
          internal_code: internalCode.trim() || null,
          price: numPrice,
          quantity: numQty,
          condition,
          side: side || null,
          position_note: positionNote.trim() || null,
          description: description.trim() || null,
          internal_notes: internalNotes.trim() || null,
          seller_vehicle_id: selectedSellerVehicleId || null,
          pickup_available: pickupAvailable,
          shipping_available: shippingAvailable,
          shipping_cost: numShipping,
          status,
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
          price: numPrice,
          quantity: numQty,
          condition,
          side: side || null,
          position_note: positionNote.trim() || null,
          description: description.trim() || null,
          internal_notes: internalNotes.trim() || null,
          seller_vehicle_id: selectedSellerVehicleId || null,
          pickup_available: pickupAvailable,
          shipping_available: shippingAvailable,
          shipping_cost: numShipping,
          status,
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Intestazione */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? 'Modifica Ricambio a Magazzino' : 'Registra Nuovo Ricambio'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? `ID: ${itemToEdit?.id}` : 'Inserimento pezzo smontato o a scaffale (`inventories`)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sezione 1: Anagrafica e Codici */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Dati Principali Ricambio</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Nome / Descrizione Ricambio <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="es. Faro Anteriore Sinistro LED, Alternatore 120A, Paraurti Anteriore"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Categoria Ricambio
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleziona categoria generica...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Stato Pubblicazione
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InventoryItem['status'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="available">Disponibile (Online su Autopia)</option>
                  <option value="reserved">Riservato / Trattativa in Corso</option>
                  <option value="sold">Venduto / Esaurito</option>
                  <option value="inactive">Non Attivo / Sospeso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Codice OEM / Originale Casa Madre</span>
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
                <label className="text-xs text-slate-300 font-medium block mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Matricola / Codice Interno Gestionale</span>
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

          {/* Sezione 2: Condizione, Lato e Scaffale */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Condizione & Posizione a Scaffale</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Condizione Pezzo
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as InventoryItem['condition'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="ottimo">Ottimo (Pari al nuovo / testato)</option>
                  <option value="buono">Buono (Normale usura funzionante)</option>
                  <option value="discreto">Discreto (Segni estetici evidenti)</option>
                  <option value="da_revisionare">Da revisionare / Rigenerare</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Lato / Posizionamento
                </label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Non specificato / Centrale</option>
                  <option value="anteriore_sx">Anteriore Sinistro</option>
                  <option value="anteriore_dx">Anteriore Destro</option>
                  <option value="posteriore_sx">Posteriore Sinistro</option>
                  <option value="posteriore_dx">Posteriore Destro</option>
                  <option value="anteriore">Anteriore</option>
                  <option value="posteriore">Posteriore</option>
                  <option value="superiore">Superiore</option>
                  <option value="inferiore">Inferiore</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
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

          {/* Sezione 3: Associazione Veicolo Piazzale */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Car className="w-3.5 h-3.5" />
              <span>Origine Pezzo (Veicolo nel Piazzale)</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Seleziona Veicolo Demolito di Provenienza
              </label>
              <select
                value={selectedSellerVehicleId}
                onChange={(e) => setSelectedSellerVehicleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Nessun veicolo specifico (Ricambio singolo da fornitore o stock)</option>
                {yardVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate ? `[${v.plate}] ` : ''}
                    {v.make} {v.model}{' '}
                    {v.year ? `(${v.year})` : ''} -{' '}
                    VIN: {v.vin ? v.vin.slice(-6) : 'Senza VIN'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                L'associazione a un veicolo del piazzale collega automaticamente le compatibilità del modello e l'anno di produzione.
              </p>
            </div>
          </div>

          {/* Sezione 4: Prezzo, Giacenza e Spedizioni */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Prezzo & Giacenza Magazzino</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Prezzo Vendita (€ IVA incl.) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="es. 85.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Giacenza / Quantità Disponibile <span className="text-red-400">*</span>
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
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Costo Spedizione (€)
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
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                />
                <span>Ritiro in sede consentito</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={shippingAvailable}
                  onChange={(e) => setShippingAvailable(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                />
                <span>Spedizione corriere disponibile</span>
              </label>
            </div>
          </div>

          {/* Note & Descrizione */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Descrizione Dettagliata per il Cliente su Autopia Shop
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dettagli sulle condizioni, integrità dei ganci, segni d'uso..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Note Interne Riservate all'Officina
              </label>
              <textarea
                rows={1}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Informazioni visibili solo all'autodemolitore (costo smontaggio, fornitore, ecc.)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Bottoni */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Aggiorna Ricambio' : 'Salva nel Magazzino'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
