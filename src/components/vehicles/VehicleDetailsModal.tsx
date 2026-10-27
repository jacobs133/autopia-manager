import React, { useState, useEffect } from 'react';
import {
  X,
  Car,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Fuel,
  Cpu,
  Edit2,
  Trash2,
  Package,
  Layers,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Database as DatabaseIcon,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { SellerVehicle, CatalogVehicle } from '../../types/vehicles';
import { VEHICLE_STATUS_OPTIONS } from '../../types/vehicles';
import { checkVehicleLinkedParts, fetchCatalogVehicleById } from '../../services/vehiclesService';

interface VehicleDetailsModalProps {
  vehicle: SellerVehicle | null;
  onClose: () => void;
  onEdit: (vehicle: SellerVehicle) => void;
  onDelete: (vehicle: SellerVehicle) => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [linkedPartsCount, setLinkedPartsCount] = useState<number | null>(null);
  const [isCheckingParts, setIsCheckingParts] = useState(false);

  // Stato del record collegato al catalogo centrale public.vehicles
  const [catalogVehicle, setCatalogVehicle] = useState<CatalogVehicle | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle) return;

    // 1. Verifica ricambi collegati per integrità referenziale
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

    // 2. Verifica e recupero variante dal catalogo centrale se presente
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
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Intestazione */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">
                  {vehicle.make} {vehicle.model}
                </h2>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${statusObj.color}`}>
                  {statusObj.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {vehicle.version || 'Versione standard'} {vehicle.year ? `• Immatricolazione ${vehicle.year}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenuto Dettagli */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-sans">
          {/* STATO COLLEGAMENTO CATALOGO CENTRALE AUTOPIA */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1.5">
                <DatabaseIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Certificazione Catalogo Centrale</span>
              </span>

              {/* Indicatore Stato */}
              {isLoadingCatalog && (
                <span className="text-[10px] text-amber-400 flex items-center space-x-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Verifica record catalogo...</span>
                </span>
              )}

              {!isLoadingCatalog && vehicle.catalog_vehicle_id && catalogVehicle && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Collegato al catalogo Autopia</span>
                </span>
              )}

              {!isLoadingCatalog && vehicle.catalog_vehicle_id && catalogError && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Accesso catalogo non disponibile</span>
                </span>
              )}

              {!isLoadingCatalog && !vehicle.catalog_vehicle_id && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1">
                  <Info className="w-3 h-3 text-slate-500" />
                  <span>Non collegato al catalogo</span>
                </span>
              )}
            </div>

            {/* Dettagli della variante dal catalogo se verificata */}
            {catalogVehicle && (
              <div className="pt-2 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Anni di Produzione:</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {catalogVehicle.year_from || '—'} – {catalogVehicle.year_to || 'in corso'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Serie / Generazione:</span>
                  <span className="text-slate-200 font-medium">{catalogVehicle.generation || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Codice Motore:</span>
                  <span className="text-slate-200 font-mono font-medium">{catalogVehicle.engine || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Potenza / Cambio:</span>
                  <span className="text-slate-200 font-medium">
                    {catalogVehicle.power || '—'} {catalogVehicle.transmission ? `(${catalogVehicle.transmission})` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Errore di lettura distinto */}
            {catalogError && (
              <p className="text-[11px] text-amber-400/90 leading-relaxed pt-1 border-t border-slate-900">
                {catalogError}. Lo stato o i permessi del record remoto non sono al momento accessibili,
                ma il riferimento <code>{vehicle.catalog_vehicle_id}</code> è conservato.
              </p>
            )}

            {/* Dicitura se non collegato */}
            {!vehicle.catalog_vehicle_id && (
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                Questo veicolo è registrato con dati manuali precedenti e non è ancora associato a una scheda
                tecnica del catalogo centrale. Clicca su &quot;Modifica Dati&quot; per associarlo al catalogo.
              </p>
            )}
          </div>

          {/* Badge Targa e Telaio */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                Targa Registrata
              </span>
              <span className="font-mono text-sm font-bold text-amber-400 tracking-wider">
                {vehicle.plate || 'Non inserita'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                Numero di Telaio (VIN)
              </span>
              <span className="font-mono text-xs text-slate-200 tracking-wider break-all">
                {vehicle.vin || 'Non inserito'}
              </span>
            </div>
          </div>

          {/* Dati Meccanici e Tecnici */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Specifiche Meccaniche Esemplare
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">Alimentazione:</span>
                <span className="text-slate-200 font-medium">{vehicle.fuel_type || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Codice Motore:</span>
                <span className="text-slate-200 font-mono font-medium">{vehicle.engine || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Potenza:</span>
                <span className="text-slate-200 font-medium">{vehicle.power || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cambio:</span>
                <span className="text-slate-200 font-medium">{vehicle.transmission || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Carrozzeria:</span>
                <span className="text-slate-200 font-medium">{vehicle.body_style || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Serie / Gen:</span>
                <span className="text-slate-200 font-medium">{vehicle.generation || '—'}</span>
              </div>
            </div>
          </div>

          {/* Accettazione e Ubicazione */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Ubicazione Piazzale & Accettazione
            </span>
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Data Ingresso Piazzale:</span>
                  <span className="text-slate-200 font-medium">
                    {vehicle.arrival_date
                      ? new Date(vehicle.arrival_date).toLocaleDateString('it-IT')
                      : 'Non specificata'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Settore / Piazzale:</span>
                  <span className="text-slate-200 font-medium">
                    {vehicle.location || 'Nessuna posizione assegnata'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ricambi Collegati a Magazzino */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-300 font-semibold">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Ricambi Smontati da Questo Veicolo</span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                {isCheckingParts ? 'Verifica...' : `${linkedPartsCount ?? 0} ricambi a magazzino`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tutti i ricambi smontati da questo veicolo ereditano le compatibilità e la tracciabilità della carrozzeria e del codice motore.
            </p>
          </div>

          {/* Note */}
          {vehicle.notes && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Note Operative:</span>
              <p className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 leading-relaxed">
                {vehicle.notes}
              </p>
            </div>
          )}

          {/* Foto se presente */}
          {vehicle.photo_url && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Fotografia Veicolo:</span>
              <a
                href={vehicle.photo_url}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center space-x-1 font-mono text-[11px]"
              >
                <span className="truncate max-w-md">{vehicle.photo_url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Footer Azioni */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onDelete(vehicle)}
            className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Elimina Scheda</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer"
            >
              Chiudi
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(vehicle);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
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
