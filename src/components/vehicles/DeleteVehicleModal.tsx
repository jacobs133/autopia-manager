import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  Loader2,
  Package,
  ShieldAlert,
} from 'lucide-react';
import type { SellerVehicle } from '../../types/vehicles';
import { checkVehicleLinkedParts, deleteSellerVehicle } from '../../services/vehiclesService';

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
      .catch((err) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
        {/* Intestazione */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 text-red-400">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Conferma Eliminazione Veicolo
              </h3>
              <p className="text-xs text-slate-400">
                {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dettagli Identificativi Veicolo */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Targa:</span>
            <span className="font-mono font-bold text-amber-400">{vehicle.plate || 'Non indicata'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Telaio (VIN):</span>
            <span className="font-mono text-slate-300 break-all">{vehicle.vin || 'Non indicato'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Stato:</span>
            <span className="text-slate-300 uppercase">{vehicle.status}</span>
          </div>
        </div>

        {/* Verifica Integrità Ricambi */}
        {isChecking ? (
          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Verifica ricambi collegati a magazzino...</span>
          </div>
        ) : hasLinkedParts ? (
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs space-y-2 text-amber-300">
            <div className="flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Eliminazione Bloccata per Integrità</strong>
                <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                  Risultano collegati <strong className="text-amber-400">{linkedCount} ricambi</strong> nella tabella <code className="text-slate-200">inventories</code> derivati da questo veicolo. Per evitare incongruenze nei dati di vendita, dissocia o elimina prima i ricambi corrispondenti.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-300 leading-relaxed">
            Sei sicuro di voler eliminare definitivamente questo veicolo dal registro? L'operazione rimuoverà la scheda dal database Supabase.
          </p>
        )}

        {/* Errore eliminazione se presente */}
        {deleteError && (
          <div className="p-2.5 bg-red-950/50 border border-red-800/60 rounded text-xs text-red-200">
            {deleteError}
          </div>
        )}

        {/* Azioni */}
        <div className="pt-2 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting || isChecking || hasLinkedParts}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Eliminazione...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Definitivamente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
