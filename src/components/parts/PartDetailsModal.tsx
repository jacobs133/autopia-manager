import React, { useState } from 'react';
import {
  X,
  Package,
  Car,
  Hash,
  DollarSign,
  Tag,
  MapPin,
  FileText,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { InventoryItem } from '../../types/inventory';
import { markInventorySoldOffline, updateInventoryItem } from '../../services/partsService';

interface PartDetailsModalProps {
  sellerId: string;
  item: InventoryItem;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onUpdated: (updatedItem: InventoryItem) => void;
}

export const PartDetailsModal: React.FC<PartDetailsModalProps> = ({
  sellerId,
  item,
  onClose,
  onEdit,
  onDelete,
  onUpdated,
}) => {
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [saleQty, setSaleQty] = useState(1);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const handleQuickSale = async () => {
    if (saleQty < 1 || saleQty > item.quantity) {
      setSaleError(`Quantità non valida. Disponibili: ${item.quantity}`);
      return;
    }
    setIsProcessingSale(true);
    setSaleError(null);
    try {
      const res = await markInventorySoldOffline(sellerId, item.id, saleQty);
      if (res.error || !res.data) {
        setSaleError(res.error || 'Errore durante lo scarico vendita al banco');
      } else {
        onUpdated(res.data);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eccezione scarico';
      setSaleError(msg);
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleToggleOnlineStatus = async () => {
    setIsTogglingStatus(true);
    const newStatus = item.status === 'available' ? 'inactive' : 'available';
    try {
      const res = await updateInventoryItem(sellerId, item.id, { status: newStatus });
      if (res.data) {
        onUpdated(res.data);
      }
    } catch (e) {
      console.warn('Errore cambio stato ricambio:', e);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const conditionLabels: Record<string, { label: string; color: string }> = {
    ottimo: { label: 'Ottimo (Testato)', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    buono: { label: 'Buono (Funzionante)', color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' },
    discreto: { label: 'Discreto', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
    da_revisionare: { label: 'Da Revisionare', color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' },
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    available: { label: 'Disponibile Online', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    reserved: { label: 'Riservato', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
    sold: { label: 'Venduto / Esaurito', color: 'text-slate-400 bg-slate-900 border-slate-700' },
    inactive: { label: 'Disattivato / Offline', color: 'text-rose-400 bg-rose-950/60 border-rose-800/60' },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    statusLabels[item.status]?.color || 'text-slate-300'
                  }`}
                >
                  {statusLabels[item.status]?.label || item.status}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: {item.id.slice(0, 8)}...
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">{item.title}</h2>
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Griglia KPI Rapidi */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
                <DollarSign className="w-3 h-3 text-amber-400" />
                <span>Prezzo Vendita</span>
              </div>
              <div className="text-xl font-bold text-amber-400 mt-1">€ {Number(item.price).toFixed(2)}</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
                <Package className="w-3 h-3 text-blue-400" />
                <span>Giacenza</span>
              </div>
              <div className="text-xl font-bold text-slate-100 mt-1">
                {item.quantity} <span className="text-xs text-slate-500 font-normal">pz</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
                <ShoppingBag className="w-3 h-3 text-emerald-400" />
                <span>Pezzi Venduti</span>
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {item.sold_quantity || 0} <span className="text-xs text-slate-500 font-normal">pz</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-purple-400" />
                <span>Condizione</span>
              </div>
              <div className="mt-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    conditionLabels[item.condition]?.color || 'text-slate-300'
                  }`}
                >
                  {conditionLabels[item.condition]?.label || item.condition}
                </span>
              </div>
            </div>
          </div>

          {/* Dati Codici e Identificazione */}
          <div className="bg-slate-950/70 rounded-lg border border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Codici di Riferimento & Ubicazione
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Codice OEM Originale:</span>
                </span>
                <span className="font-mono text-slate-100 font-bold">
                  {item.oem_code || 'Non indicato'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Matricola Interna:</span>
                </span>
                <span className="font-mono text-slate-100 font-bold">
                  {item.internal_code || 'Non indicata'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Lato / Posizionamento:</span>
                </span>
                <span className="text-slate-200 capitalize">
                  {item.side ? item.side.replace('_', ' ') : 'Centrale / Universale'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ubicazione / Scaffale:</span>
                </span>
                <span className="text-amber-300 font-medium">
                  {item.position_note || 'Nessuna corsia specificata'}
                </span>
              </div>
            </div>
          </div>

          {/* Dettagli Logistica Spedizioni */}
          <div className="bg-slate-950/70 rounded-lg border border-slate-800 p-4 space-y-2 text-xs">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Logistica & Consegna
            </h3>
            <div className="flex items-center space-x-6 text-slate-300">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${item.pickup_available ? 'text-emerald-400' : 'text-slate-600'}`}
                />
                <span>Ritiro al banco: {item.pickup_available ? 'Attivo' : 'Non disponibile'}</span>
              </span>

              <span className="flex items-center space-x-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${item.shipping_available ? 'text-emerald-400' : 'text-slate-600'}`}
                />
                <span>
                  Spedizione corriere: {item.shipping_available ? `Disponibile (€ ${Number(item.shipping_cost || 0).toFixed(2)})` : 'Non disponibile'}
                </span>
              </span>
            </div>
          </div>

          {/* Descrizione & Note */}
          {item.description && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Descrizione Pubblica
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {item.description}
              </div>
            </div>
          )}

          {item.internal_notes && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Note Interne Officina
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 italic">
                {item.internal_notes}
              </div>
            </div>
          )}

          {/* Sezione Ricambio Venduto / Esaurito */}
          {(item.status === 'sold' || item.quantity === 0) && (
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1.5">
              <div className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ricambio Venduto / Esaurito ({item.sold_quantity || 1} pz)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                La disponibilità di questo ricambio è esaurita. Puoi consultare i dettagli della vendita o le richieste associate nella sezione <strong>Ordini & Vendite</strong> del gestionale.
              </p>
            </div>
          )}

          {/* Sezione Scarico Rapido Vendita al Banco */}
          {item.quantity > 0 && (
            <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Scarico Rapido Vendita al Banco / Offline</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hai venduto questo pezzo direttamente in officina? Registralo subito per scalare la giacenza ed evitare doppie vendite online.
                  </p>
                </div>
              </div>

              {saleError && (
                <div className="text-xs text-red-400 bg-red-950/60 p-2 rounded border border-red-800/80">
                  {saleError}
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                  <span>Quantità venduta:</span>
                  <input
                    type="number"
                    min="1"
                    max={item.quantity}
                    value={saleQty}
                    onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 bg-slate-950 border border-emerald-700/60 rounded px-2 py-1 text-center font-bold text-slate-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleQuickSale}
                  disabled={isProcessingSale}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  {isProcessingSale ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrazione...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Conferma Scarico Banco</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Azioni */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/50 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina Ricambio</span>
            </button>

            <button
              type="button"
              onClick={handleToggleOnlineStatus}
              disabled={isTogglingStatus}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <span>{item.status === 'available' ? 'Metti Offline' : 'Attiva Online'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-500/20"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifica Dati</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
