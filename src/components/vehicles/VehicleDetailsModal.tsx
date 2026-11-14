import React, { useState, useEffect } from 'react';
import {
  X,
  Car,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Package,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Database as DatabaseIcon,
  Loader2,
} from 'lucide-react';
import type { SellerVehicle, CatalogVehicle } from '../../types/vehicles';
import { VEHICLE_STATUS_OPTIONS } from '../../types/vehicles';
import { checkVehicleLinkedParts, fetchCatalogVehicleById } from '../../services/vehiclesService';
import { Button, StatusBadge } from '../ui/DesignSystem';

interface VehicleDetailsModalProps {
  vehicle: SellerVehicle | null;
  onClose: () => void;
  onEdit: (vehicle: SellerVehicle) => void;
  onDelete: (vehicle: SellerVehicle) => void;
  onExtractParts?: (vehicle: SellerVehicle) => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  onClose,
  onEdit,
  onDelete,
  onExtractParts,
}) => {
  const [linkedPartsCount, setLinkedPartsCount] = useState<number | null>(null);
  const [isCheckingParts, setIsCheckingParts] = useState(false);

  const [catalogVehicle, setCatalogVehicle] = useState<CatalogVehicle | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle) return;

    setIsCheckingParts(true);
    checkVehicleLinkedParts(vehicle.id)
      .then((res) => {
        setLinkedPartsCount(res.count);
      })
      .catch(() => {
        setLinkedPartsCount(null);
      })
      .finally(() => {
        setIsCheckingParts(false);
      });

    if (vehicle.catalog_vehicle_id) {
      setIsLoadingCatalog(true);
      setCatalogError(null);
      setCatalogVehicle(null);

      fetchCatalogVehicleById(vehicle.catalog_vehicle_id)
        .then((res) => {
          if (res.error) {
            setCatalogError(res.error);
            setCatalogVehicle(null);
          } else if (res.data) {
            setCatalogVehicle(res.data);
            setCatalogError(null);
          } else {
            setCatalogError('Record catalogo non trovato nel database centrale');
            setCatalogVehicle(null);
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Errore durante la verifica del catalogo';
          setCatalogError(msg);
          setCatalogVehicle(null);
        })
        .finally(() => {
          setIsLoadingCatalog(false);
        });
    } else {
      setCatalogVehicle(null);
      setIsLoadingCatalog(false);
      setCatalogError(null);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const statusObj = VEHICLE_STATUS_OPTIONS.find((s) => s.value === vehicle.status) || {
    label: vehicle.status || 'Non specificato',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10201E]/45 backdrop-blur-[2px] select-none font-sans">
      <div className="w-full max-w-2xl bg-white border border-[#E2E8E7] rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Intestazione */}
        <div className="px-6 py-4 bg-[#FAFBFB] border-b border-[#E2E8E7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF3F1] text-[#074E44] flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1A2322]">
                  {vehicle.make} {vehicle.model}
                </h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusObj.color}`}>
                  {statusObj.label}
                </span>
              </div>
              <p className="text-xs text-[#5C6B68] mt-0.5">
                {vehicle.version || 'Versione standard'} {vehicle.year ? `· Immatricolazione ${vehicle.year}` : ''}
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

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Stato Catalogo */}
          <div className="bg-[#F7FAF9] p-4 rounded-xl border border-[#E2E8E7] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1A2322] flex items-center gap-1.5">
                <DatabaseIcon className="w-3.5 h-3.5 text-[#074E44]" />
                <span>Scheda Catalogo Autopia</span>
              </span>

              {isLoadingCatalog && (
                <span className="text-[11px] text-[#074E44] flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifica...</span>
                </span>
              )}

              {!isLoadingCatalog && vehicle.catalog_vehicle_id && catalogVehicle && (
                <StatusBadge tone="success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Collegato al catalogo</span>
                </StatusBadge>
              )}

              {!isLoadingCatalog && vehicle.catalog_vehicle_id && catalogError && (
                <StatusBadge tone="warning">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Verifica non disponibile</span>
                </StatusBadge>
              )}

              {!isLoadingCatalog && !vehicle.catalog_vehicle_id && (
                <StatusBadge tone="neutral">
                  <Info className="w-3 h-3" />
                  <span>Inserimento manuale</span>
                </StatusBadge>
              )}
            </div>

            {catalogVehicle && (
              <div className="pt-2.5 border-t border-[#E2E8E7] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-[#5C6B68] block">Produzione</span>
                  <span className="text-[#1A2322] font-mono font-semibold tabular-nums">
                    {catalogVehicle.year_from || '—'} – {catalogVehicle.year_to || 'in corso'}
                  </span>
                </div>
                <div>
                  <span className="text-[#5C6B68] block">Serie</span>
                  <span className="text-[#1A2322] font-semibold">{catalogVehicle.generation || '—'}</span>
                </div>
                <div>
                  <span className="text-[#5C6B68] block">Motore</span>
                  <span className="text-[#1A2322] font-mono font-semibold">{catalogVehicle.engine || '—'}</span>
                </div>
                <div>
                  <span className="text-[#5C6B68] block">Potenza / Cambio</span>
                  <span className="text-[#1A2322] font-semibold">
                    {catalogVehicle.power || '—'}{' '}
                    {catalogVehicle.transmission ? `(${catalogVehicle.transmission})` : ''}
                  </span>
                </div>
              </div>
            )}

            {catalogError && (
              <p className="text-[11px] text-amber-800 leading-relaxed pt-2 border-t border-[#E2E8E7]">
                {catalogError}. Il riferimento tecnico del veicolo rimane salvato.
              </p>
            )}

            {!vehicle.catalog_vehicle_id && (
              <p className="text-[11px] text-[#5C6B68] leading-relaxed pt-2 border-t border-[#E2E8E7]">
                Questo veicolo non è ancora collegato a una scheda del catalogo centrale. Usa &quot;Modifica dati&quot; per abbinarlo.
              </p>
            )}
          </div>

          {/* Targa e Telaio */}
          <div className="grid grid-cols-2 gap-3 bg-[#F7FAF9] p-4 rounded-xl border border-[#E2E8E7]">
            <div>
              <span className="text-[11px] font-medium text-[#5C6B68] block mb-0.5">
                Targa
              </span>
              <span className="font-mono text-sm font-bold text-[#074E44] tracking-wider">
                {vehicle.plate || 'Non inserita'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#5C6B68] block mb-0.5">
                Numero di telaio (VIN)
              </span>
              <span className="font-mono text-xs text-[#1A2322] tracking-wider break-all">
                {vehicle.vin || 'Non inserito'}
              </span>
            </div>
          </div>

          {/* Specifiche Meccaniche */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#1A2322]">Specifiche tecniche</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-[#E2E8E7]">
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Alimentazione</span>
                <span className="text-[#1A2322] font-semibold">{vehicle.fuel_type || '—'}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Codice motore</span>
                <span className="text-[#1A2322] font-mono font-semibold">{vehicle.engine || '—'}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Potenza</span>
                <span className="text-[#1A2322] font-semibold">{vehicle.power || '—'}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Cambio</span>
                <span className="text-[#1A2322] font-semibold">{vehicle.transmission || '—'}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Carrozzeria</span>
                <span className="text-[#1A2322] font-semibold">{vehicle.body_style || '—'}</span>
              </div>
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Serie</span>
                <span className="text-[#1A2322] font-semibold">{vehicle.generation || '—'}</span>
              </div>
            </div>
          </div>

          {/* Ubicazione e Accettazione */}
          <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-[#E2E8E7]">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#074E44] shrink-0" />
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Data ingresso</span>
                <span className="text-[#1A2322] font-semibold tabular-nums">
                  {vehicle.arrival_date
                    ? new Date(vehicle.arrival_date).toLocaleDateString('it-IT')
                    : 'Non specificata'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#074E44] shrink-0" />
              <div>
                <span className="text-[#5C6B68] block text-[11px]">Settore / Piazzale</span>
                <span className="text-[#1A2322] font-semibold">
                  {vehicle.location || 'Non assegnato'}
                </span>
              </div>
            </div>
          </div>

          {/* Ricambi Collegati */}
          <div className="bg-[#EAF3F1]/50 p-4 rounded-xl border border-[#C6DFDA] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[#1A2322] font-bold">
                <Package className="w-4 h-4 text-[#074E44]" />
                <span>Ricambi collegati a magazzino</span>
              </div>
              <p className="text-[11px] text-[#5C6B68]">
                I ricambi estratti da questo veicolo ereditano automaticamente le compatibilità.
              </p>
            </div>
            <StatusBadge tone="brand">
              {isCheckingParts ? 'Verifica...' : `${linkedPartsCount ?? 0} ricambi`}
            </StatusBadge>
          </div>

          {vehicle.notes && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#2E3C3A] block">Note operative</span>
              <p className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E2E8E7] text-[#374845] leading-relaxed">
                {vehicle.notes}
              </p>
            </div>
          )}

          {vehicle.photo_url && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#2E3C3A] block">Fotografia</span>
              <a
                href={vehicle.photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#074E44] hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
              >
                <span className="truncate max-w-md">{vehicle.photo_url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Footer Azioni */}
        <div className="px-6 py-3.5 bg-[#FAFBFB] border-t border-[#E2E8E7] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(vehicle)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Elimina scheda</span>
          </Button>

          <div className="flex items-center gap-2">
            {onExtractParts && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onExtractParts(vehicle);
                }}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Recupera ricambi</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(vehicle);
              }}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifica dati</span>
            </Button>

            <Button variant="secondary" size="sm" onClick={onClose}>
              Chiudi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
