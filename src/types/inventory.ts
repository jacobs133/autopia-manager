import type { Database } from './database.types';

export type InventoryItem = Database['public']['Tables']['inventories']['Row'];
export type InventoryInsert = Database['public']['Tables']['inventories']['Insert'];
export type InventoryUpdate = Database['public']['Tables']['inventories']['Update'];

export type PartCategory = Database['public']['Tables']['part_categories']['Row'];
export type Part = Database['public']['Tables']['parts']['Row'];
export type SellerLocation = Database['public']['Tables']['seller_inventory_locations']['Row'];

export type PartCondition = Database['public']['Enums']['part_condition'];
export type InventoryStatus = Database['public']['Enums']['inventory_status'];
export type SellerStatus = Database['public']['Enums']['seller_status'];

export interface InventoryFilters {
  search?: string;
  categoryId?: string;
  condition?: PartCondition | 'all';
  status?: InventoryStatus | 'all';
  sellerVehicleId?: string;
  minPrice?: number;
  maxPrice?: number;
}

export const PART_CONDITIONS: { value: PartCondition; label: string; description: string; color: string }[] = [
  { value: 'ottimo', label: 'Ottimo (Pari al nuovo)', description: 'Nessun difetto visibile, pronto al montaggio', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'buono', label: 'Buono (Normale usura)', description: 'Funzionante con leggeri segni di normale utilizzo', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'discreto', label: 'Discreto (Segni evidenti)', description: 'Integrità strutturale garantita, segni d\'usura visibili', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'da_revisionare', label: 'Da Revisionare / Core', description: 'Necessita di ripristino professionale o rigenerazione', color: 'bg-rose-50 text-rose-800 border-rose-200' },
];

export const INVENTORY_STATUSES: { value: InventoryStatus; label: string; badgeColor: string }[] = [
  { value: 'available', label: 'Disponibile Online', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'reserved', label: 'Riservato', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'sold', label: 'Venduto', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'inactive', label: 'Bozza Offline', badgeColor: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export const SIDES_OPTIONS = [
  'Anteriore',
  'Posteriore',
  'Anteriore Destro (DX)',
  'Anteriore Sinistro (SX)',
  'Posteriore Destro (DX)',
  'Posteriore Sinistro (SX)',
  'Centrale / Universale',
];

export interface CsvPartRow {
  title: string;
  oem_code?: string;
  internal_code?: string;
  category_name?: string;
  price: number;
  quantity: number;
  condition?: PartCondition;
  side?: string;
  position_note?: string;
  description?: string;
  pickup_available?: boolean;
  shipping_available?: boolean;
  shipping_cost?: number;
}
