import React, { useState } from 'react';
import {
  X,
  Package,
  Hash,
  DollarSign,
  Tag,
  MapPin,
  Layers,
  ShoppingBag,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type { InventoryItem } from '../../types/inventory';
import { markInventorySoldOffline, updateInventoryItem } from '../../services/partsService';
import {
  uiClasses,
  Button,
  KpiCard,
  StatusBadge,
  AlertBanner,
  type BadgeTone,
} from '../ui/DesignSystem';

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

  const conditionLabels: Record<string, { label: string; tone: BadgeTone }> = {
    ottimo: { label: 'Ottimo (Testato)', tone: 'success' },
    buono: { label: 'Buono (Funzionante)', tone: 'info' },
    discreto: { label: 'Discreto', tone: 'warning' },
    da_revisionare: { label: 'Da Revisionare', tone: 'neutral' },
  };

  const statusLabels: Record<string, { label: string; tone: BadgeTone }> = {
    available: { label: 'Disponibile Online', tone: 'success' },
    reserved: { label: 'Riservato', tone: 'warning' },
    sold: { label: 'Venduto / Esaurito', tone: 'neutral' },
    inactive: { label: 'Disattivato / Offline', tone: 'danger' },
  };

  const statusMeta = statusLabels[item.status];
  const condMeta = conditionLabels[item.condition];

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E2E8E7] rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col text-[#1A2322] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEF2F1] bg-[#FAFBFB]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#EAF3F1] border border-[#C6DFDA] text-[#074E44] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge tone={statusMeta?.tone || 'neutral'}>
                  {statusMeta?.label || item.status}
                </StatusBadge>
                <span className="text-[11px] text-[#5C6B68] font-mono tabular-nums">
                  ID: {item.id.slice(0, 8)}
                </span>
              </div>
              <h2 className="text-base font-bold text-[#162220] mt-0.5 truncate">{item.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B68] hover:text-[#1A2322] hover:bg-[#EDF2F1] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Griglia KPI Rapidi */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Prezzo vendita"
              value={`€ ${Number(item.price).toFixed(2)}`}
              icon={<DollarSign className="w-3.5 h-3.5" />}
              accent="brand"
            />
            <KpiCard
              label="Giacenza"
              value={
                <>
                  {item.quantity} <span className="text-xs font-medium text-[#5C6B68]">pz</span>
                </>
              }
              icon={<Package className="w-3.5 h-3.5" />}
            />
            <KpiCard
              label="Pezzi venduti"
              value={
                <>
                  {item.sold_quantity || 0}{' '}
                  <span className="text-xs font-medium text-[#5C6B68]">pz</span>
                </>
              }
              icon={<ShoppingBag className="w-3.5 h-3.5" />}
              accent="success"
            />
            <div className="bg-white border border-[#E2E8E7] rounded-xl p-4 shadow-[0_1px_2px_rgba(7,78,68,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[#5C6B68]">
                <span>Condizione</span>
                <Tag className="w-3.5 h-3.5 text-[#074E44]/80" />
              </div>
              <div className="mt-2">
                <StatusBadge tone={condMeta?.tone || 'neutral'}>
                  {condMeta?.label || item.condition}
                </StatusBadge>
              </div>
            </div>
          </div>

          {/* Dati Codici e Identificazione */}
          <div className="bg-[#FAFBFB] rounded-xl border border-[#E2E8E7] p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase text-[#5C6B68] tracking-wider">
              Codici di Riferimento & Ubicazione
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8E7]">
                <span className="text-[#5C6B68] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#8A9895]" />
                  <span>Codice OEM:</span>
                </span>
                <span className="font-mono text-[#1A2322] font-bold">
                  {item.oem_code || 'Non indicato'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8E7]">
                <span className="text-[#5C6B68] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#8A9895]" />
                  <span>Matricola Interna:</span>
                </span>
                <span className="font-mono text-[#1A2322] font-bold">
                  {item.internal_code || 'Non indicata'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8E7]">
                <span className="text-[#5C6B68] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#8A9895]" />
                  <span>Posizionamento:</span>
                </span>
                <span className="text-[#1A2322] font-medium capitalize">
                  {item.side ? item.side.replace('_', ' ') : 'Centrale / Universale'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8E7]">
                <span className="text-[#5C6B68] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#074E44]" />
                  <span>Scaffale:</span>
                </span>
                <span className="text-[#074E44] font-semibold">
                  {item.position_note || 'Non specificato'}
                </span>
              </div>
            </div>
          </div>

          {/* Dettagli Logistica Spedizioni */}
          <div className="bg-[#FAFBFB] rounded-xl border border-[#E2E8E7] p-4 space-y-2 text-xs">
            <h3 className="text-xs font-bold uppercase text-[#5C6B68] tracking-wider">
              Logistica & Consegna
            </h3>
            <div className="flex flex-wrap items-center gap-6 text-[#3F4E4B]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${item.pickup_available ? 'text-[#074E44]' : 'text-[#A0AEAB]'}`}
                />
                <span>Ritiro al banco: {item.pickup_available ? 'Attivo' : 'Non disponibile'}</span>
              </span>

              <span className="flex items-center gap-1.5 tabular-nums">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${item.shipping_available ? 'text-[#074E44]' : 'text-[#A0AEAB]'}`}
                />
                <span>
                  Spedizione corriere:{' '}
                  {item.shipping_available
                    ? `Disponibile (€ ${Number(item.shipping_cost || 0).toFixed(2)})`
                    : 'Non disponibile'}
                </span>
              </span>
            </div>
          </div>

          {/* Descrizione & Note */}
          {item.description && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#5C6B68] uppercase tracking-wider">
                Descrizione Pubblica
              </div>
              <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7] text-xs text-[#2E3C3A] leading-relaxed whitespace-pre-line">
                {item.description}
              </div>
            </div>
          )}

          {item.internal_notes && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#5C6B68] uppercase tracking-wider">
                Note Interne Officina
              </div>
              <div className="bg-[#FAFBFB] p-3.5 rounded-xl border border-[#E2E8E7] text-xs text-[#5C6B68] italic">
                {item.internal_notes}
              </div>
            </div>
          )}

          {/* Sezione Ricambio Venduto / Esaurito */}
          {(item.status === 'sold' || item.quantity === 0) && (
            <AlertBanner tone="info" title={`Ricambio Venduto / Esaurito (${item.sold_quantity || 1} pz)`}>
              La disponibilità di questo ricambio è esaurita. Puoi consultare i dettagli nella sezione{' '}
              <strong>Ordini e Vendite</strong> del gestionale.
            </AlertBanner>
          )}

          {/* Sezione Scarico Rapido Vendita al Banco */}
          {item.quantity > 0 && (
            <div className="p-4 rounded-xl bg-[#EAF3F1]/70 border border-[#C6DFDA] space-y-3">
              <div>
                <div className="text-xs font-bold text-[#074E44] flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Scarico Rapido Vendita al Banco / Offline</span>
                </div>
                <p className="text-[11px] text-[#3F4E4B] mt-0.5 leading-relaxed">
                  Hai venduto questo pezzo direttamente in officina? Registralo subito per scalare la giacenza ed evitare doppie vendite online.
                </p>
              </div>

              {saleError && <AlertBanner tone="danger">{saleError}</AlertBanner>}

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-[#2E3C3A]">
                  <span className="font-medium">Quantità venduta:</span>
                  <input
                    type="number"
                    min="1"
                    max={item.quantity}
                    value={saleQty}
                    onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={`${uiClasses.input} w-20 text-center font-bold tabular-nums`}
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleQuickSale}
                  loading={isProcessingSale}
                >
                  {!isProcessingSale && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isProcessingSale ? 'Registrazione...' : 'Conferma Scarico Banco'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-[#EEF2F1] bg-[#FAFBFB]">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDelete(item)}
              className="text-red-700 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina Ricambio</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleOnlineStatus}
              loading={isTogglingStatus}
            >
              <span>{item.status === 'available' ? 'Metti Offline' : 'Attiva Online'}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Chiudi
            </Button>
            <Button variant="primary" size="sm" onClick={() => onEdit(item)}>
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifica Dati</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
