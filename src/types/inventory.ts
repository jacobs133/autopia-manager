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
  { value: 'ottimo', label: 'Ottimo (Pari al nuovo)', description: 'Nessun difetto visibile, pronto al montaggio', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' },
  { value: 'buono', label: 'Buono (Normale usura)', description: 'Funzionante con leggeri segni di normale utilizzo', color: 'bg-blue-950/80 text-blue-300 border-blue-800/60' },
  { value: 'discreto', label: 'Discreto (Segni evidenti)', description: 'Integrità strutturale garantita, segni d\'usura visibili', color: 'bg-amber-950/80 text-amber-300 border-amber-800/60' },
  { value: 'da_revisionare', label: 'Da Revisionare / Core', description: 'Necessita di ripristino professionale o rigenerazione', color: 'bg-rose-950/80 text-rose-300 border-rose-800/60' },
];

export const INVENTORY_STATUSES: { value: InventoryStatus; label: string; badgeColor: string }[] = [
  { value: 'available', label: 'Disponibile Online', badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  { value: 'reserved', label: 'Riservato', badgeColor: 'bg-amber-950 text-amber-300 border-amber-800' },
  { value: 'sold', label: 'Venduto', badgeColor: 'bg-slate-800 text-slate-400 border-slate-700' },
  { value: 'inactive', label: 'Bozza Offline', badgeColor: 'bg-slate-900 text-slate-500 border-slate-800' },
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
