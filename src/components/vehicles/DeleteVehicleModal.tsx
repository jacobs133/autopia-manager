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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10201E]/45 backdrop-blur-[2px] select-none font-sans">
      <div className="w-full max-w-md bg-white border border-[#E2E8E7] rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A2322]">
                Elimina scheda veicolo
              </h3>
              <p className="text-xs text-[#5C6B68]">
                {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#5C6B68] hover:text-[#1A2322] p-1 rounded-lg hover:bg-[#EDF2F1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#F7FAF9] p-3.5 rounded-xl border border-[#E2E8E7] text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[#5C6B68]">Targa</span>
            <span className="font-mono font-bold text-[#1A2322]">{vehicle.plate || 'Non indicata'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#5C6B68]">Telaio (VIN)</span>
            <span className="font-mono text-[#1A2322] break-all text-right">{vehicle.vin || 'Non indicato'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5C6B68]">Stato</span>
            <span className="text-[#1A2322] font-medium uppercase">{vehicle.status}</span>
          </div>
        </div>

        {isChecking ? (
          <div className="p-3 bg-[#F7FAF9] rounded-xl border border-[#E2E8E7] text-xs text-[#5C6B68] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#074E44]" />
            <span>Verifica ricambi collegati...</span>
          </div>
        ) : hasLinkedParts ? (
          <AlertBanner tone="warning" title="Eliminazione non consentita">
            Risultano collegati <strong>{linkedCount} ricambi</strong> in magazzino associati a questo veicolo. Rimuovi o dissocia prima i ricambi corrispondenti.
          </AlertBanner>
        ) : (
          <p className="text-xs text-[#374845] leading-relaxed">
            Confermi di voler eliminare definitivamente questo veicolo? L'operazione non può essere annullata.
          </p>
        )}

        {deleteError && <AlertBanner tone="danger">{deleteError}</AlertBanner>}

        <div className="pt-2 flex items-center justify-end gap-2">
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
  );
};
