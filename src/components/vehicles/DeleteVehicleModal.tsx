import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { SellerVehicle } from '../../types/vehicles';
import { checkVehicleLinkedParts, deleteSellerVehicle } from '../../services/vehiclesService';
import { AlertBanner, Button } from '../ui/DesignSystem';

interface DeleteVehicleModalProps {
  vehicle: SellerVehicle | null;
  sellerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteVehicleModal: React.FC<DeleteVehicleModalProps> = ({
  vehicle,
  sellerId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [linkedCount, setLinkedCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle || !isOpen) return;

    setIsChecking(true);
    setDeleteError(null);
    checkVehicleLinkedParts(vehicle.id)
      .then((res) => {
        setLinkedCount(res.count);
      })
      .catch(() => {
        setDeleteError('Errore durante la verifica dei ricambi collegati');
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const hasLinkedParts = linkedCount > 0;

  const handleConfirmDelete = async () => {
    if (hasLinkedParts) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteSellerVehicle(sellerId, vehicle.id);
      if (!res.success) {
        setDeleteError(res.error || 'Errore durante l\'eliminazione del veicolo');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Eccezione imprevista durante la cancellazione');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1615]/60 backdrop-blur-[2px] select-none font-sans">
      <div className="w-full max-w-md bg-white border border-[#DCE4E2] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#121B1A] text-white border-b border-[#253331] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">Elimina scheda veicolo</h3>
              <p className="text-[11px] text-[#9AB0AC]">
                {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#9AB0AC] hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[#F6F8F8] p-3.5 rounded-xl border border-[#E1E8E6] text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#566663]">Targa</span>
              <span className="font-mono font-bold text-[#131C1B]">{vehicle.plate || 'Non indicata'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#566663]">Telaio (VIN)</span>
              <span className="font-mono text-[#131C1B] break-all text-right">{vehicle.vin || 'Non indicato'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#566663]">Stato</span>
              <span className="text-[#131C1B] font-medium uppercase">{vehicle.status}</span>
            </div>
          </div>

          {isChecking ? (
            <div className="p-3 bg-[#F6F8F8] rounded-xl border border-[#E1E8E6] text-xs text-[#566663] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#074E44]" />
              <span>Verifica ricambi collegati...</span>
            </div>
          ) : hasLinkedParts ? (
            <AlertBanner tone="warning" title="Eliminazione non consentita">
              Risultano collegati <strong>{linkedCount} ricambi</strong> in magazzino associati a questo veicolo. Rimuovi o dissocia prima i ricambi corrispondenti.
            </AlertBanner>
          ) : (
            <p className="text-xs text-[#374845] leading-relaxed">
              Confermi di voler eliminare definitivamente questo veicolo? L&apos;operazione non può essere annullata.
            </p>
          )}

          {deleteError && <AlertBanner tone="danger">{deleteError}</AlertBanner>}

          <div className="pt-2 border-t border-[#EEF2F1] flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
              Annulla
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={handleConfirmDelete}
              disabled={isDeleting || isChecking || hasLinkedParts}
            >
              {!isDeleting && <Trash2 className="w-3.5 h-3.5" />}
              <span>{isDeleting ? 'Eliminazione...' : 'Elimina veicolo'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
