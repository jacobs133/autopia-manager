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
  { value: 'in_attesa', label: 'In attesa di bonifica', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'bonificato', label: 'Bonificato / Sicuro', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'in_smontaggio', label: 'In smontaggio ricambi', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { value: 'completato', label: 'Smontaggio completato', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'demolito', label: 'Carcassa rottamata/pressata', color: 'bg-slate-100 text-slate-700 border-slate-200' },
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
