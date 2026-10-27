import type { Database } from './database.types';

export type SellerVehicle = Database['public']['Tables']['seller_vehicles']['Row'];
export type SellerVehicleInsert = Database['public']['Tables']['seller_vehicles']['Insert'];
export type SellerVehicleUpdate = Database['public']['Tables']['seller_vehicles']['Update'];

export type CatalogVehicle = Database['public']['Tables']['vehicles']['Row'];
export type CatalogVehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type CatalogVehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

export interface VehicleFilters {
  search?: string;
  status?: string;
  year?: number | null;
  fuelType?: string;
}

export interface CatalogMakeInfo {
  name: string;
  count: number;
  rawValues: string[];
}

export interface CatalogBrowseFilters {
  search?: string;
  make?: string;
  model?: string;
  generation?: string;
  year?: number | null;
  fuelType?: string;
  bodyStyle?: string;
}

export interface CatalogCacheStats {
  totalVehicles: number;
  totalMakes: number;
  isCached: boolean;
  lastFetched: string | null;
}

export const VEHICLE_STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'in_attesa', label: 'In attesa di bonifica', color: 'bg-amber-950/70 text-amber-300 border-amber-800/60' },
  { value: 'bonificato', label: 'Bonificato / Sicuro', color: 'bg-blue-950/70 text-blue-300 border-blue-800/60' },
  { value: 'in_smontaggio', label: 'In smontaggio ricambi', color: 'bg-purple-950/70 text-purple-300 border-purple-800/60' },
  { value: 'completato', label: 'Smontaggio completato', color: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' },
  { value: 'demolito', label: 'Carcassa rottamata/pressata', color: 'bg-slate-800 text-slate-300 border-slate-700' },
];

export const FUEL_TYPE_OPTIONS = [
  'Benzina',
  'Diesel',
  'Ibrida (Benzina/Elettrico)',
  'Ibrida (Diesel/Elettrico)',
  'Elettrica',
  'GPL',
  'Metano',
];

export const TRANSMISSION_OPTIONS = [
  'Manuale',
  'Automatico',
  'Sequenziale',
  'CVT',
];

export const BODY_STYLE_OPTIONS = [
  'Berlina',
  'Station Wagon',
  'SUV / Crossover',
  'Monovolume',
  'Coupé',
  'Cabriolet',
  'Furgone / Commerciale',
  'Pick-up',
];
