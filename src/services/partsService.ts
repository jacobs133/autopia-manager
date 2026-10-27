import { getSupabaseClient } from './supabaseClient';
import type {
  InventoryItem,
  InventoryInsert,
  InventoryUpdate,
  PartCategory,
  Part,
  SellerLocation,
  InventoryFilters,
  CsvPartRow,
  SellerStatus,
} from '../types/inventory';
import type { SellerProfile } from '../contexts/AuthContext';

export const ADMIN_EMAIL = 'lollogamer2009@gmail.com';

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Recupera l'elenco delle categorie ricambi ufficiali Autopia.
 */
export async function fetchPartCategories(): Promise<{ data: PartCategory[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  try {
    const { data, error } = await client
      .from('part_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: `Errore caricamento categorie: ${error.message}` };
    }

    return { data: data || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura categorie ricambi';
    return { data: [], error: msg };
  }
}

/**
 * Recupera l'elenco dei tipi di ricambio (anagrafica generica parts).
 */
export async function fetchParts(categoryId?: string): Promise<{ data: Part[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  try {
    let req = client.from('parts').select('*').order('name', { ascending: true });
    if (categoryId) {
      req = req.eq('category_id', categoryId);
    }
    const { data, error } = await req;
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura ricambi';
    return { data: [], error: msg };
  }
}

/**
 * Trova o crea un record in `parts` per garantire il vincolo di foreign key `inventories_part_id_fkey`.
 */
export async function findOrCreatePart(
  name: string,
  categoryId?: string | null
): Promise<{ partId: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { partId: null, error: 'Client Supabase non inizializzato' };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { partId: null, error: 'Nome del ricambio non specificato' };
  }

  try {
    // 1. Cerca ricambio esistente per nome (case-insensitive)
    const { data: existing } = await client
      .from('parts')
      .select('id')
      .ilike('name', cleanName)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return { partId: existing.id, error: null };
    }

    // 2. Se non esiste, crea lo slug e inserisci
    const slug = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `part-${Date.now()}`;

    // Aggiungi suffisso casuale allo slug per prevenire collisioni
    const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;

    const { data: created, error: insertError } = await client
      .from('parts')
      .insert({
        name: cleanName,
        slug: uniqueSlug,
        category_id: categoryId || null,
      })
      .select('id')
      .single();

    if (insertError) {
      // Se fallisce l'inserimento per permessi, cerca un part generico come fallback
      const { data: fallback } = await client.from('parts').select('id').limit(1).maybeSingle();
      if (fallback?.id) {
        return { partId: fallback.id, error: null };
      }
      return { partId: null, error: `Impossibile associare anagrafica ricambio: ${insertError.message}` };
    }

    return { partId: created?.id || null, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore anagrafica ricambi';
    return { partId: null, error: msg };
  }
}

export interface FetchInventoryResponse {
  data: InventoryItem[];
  totalCount: number;
  error: string | null;
}

/**
 * Recupera l'elenco paginato e filtrato dei ricambi a magazzino per un determinato venditore.
 */
export async function fetchSellerInventory(params: {
  sellerId: string;
  filters: InventoryFilters;
  page: number;
  pageSize: number;
}): Promise<FetchInventoryResponse> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], totalCount: 0, error: 'Client Supabase non inizializzato' };
  }

  try {
    const { sellerId, filters, page, pageSize } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('inventories')
      .select('*', { count: 'exact' })
      .eq('seller_id', sellerId);

    // Filtro Ricerca (titolo, codice OEM, matricola interna)
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim().replace(/[%*,\\]/g, '');
      query = query.or(
        `title.ilike.%${term}%,oem_code.ilike.%${term}%,internal_code.ilike.%${term}%,position_note.ilike.%${term}%`
      );
    }

    // Filtro Stato Disponibilità
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Filtro Condizione Ricambio
    if (filters.condition && filters.condition !== 'all') {
      query = query.eq('condition', filters.condition);
    }

    // Filtro Veicolo Piazzale Collegato
    if (filters.sellerVehicleId && filters.sellerVehicleId !== 'all') {
      query = query.eq('seller_vehicle_id', filters.sellerVehicleId);
    }

    // Filtro Prezzo
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      query = query.lte('price', filters.maxPrice);
    }

    // Ordinamento: ricambi modificati/aggiunti più di recente per primi
    query = query.order('updated_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return {
        data: [],
        totalCount: 0,
        error: `Errore caricamento inventario: ${error.message}`,
      };
    }

    return {
      data: data || [],
      totalCount: count || 0,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura inventario ricambi';
    return { data: [], totalCount: 0, error: msg };
  }
}

/**
 * Crea un nuovo ricambio nel magazzino `inventories`.
 */
export async function createInventoryItem(
  sellerId: string,
  payload: {
    title: string;
    part_id?: string | null;
    category_id?: string | null;
    oem_code?: string | null;
    internal_code?: string | null;
    price: number;
    quantity: number;
    condition: InventoryItem['condition'];
    side?: string | null;
    position_note?: string | null;
    seller_vehicle_id?: string | null;
    source_vehicle_id?: string | null;
    description?: string | null;
    internal_notes?: string | null;
    pickup_available?: boolean;
    shipping_available?: boolean;
    shipping_cost?: number | null;
    status?: InventoryItem['status'];
  }
): Promise<{ data: InventoryItem | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Client Supabase non inizializzato' };
  }

  if (!payload.title || !payload.title.trim()) {
    return { data: null, error: 'Il titolo del ricambio è obbligatorio' };
  }

  if (payload.price === undefined || isNaN(payload.price) || payload.price < 0) {
    return { data: null, error: 'Inserisci un prezzo valido (es. 45.00)' };
  }

  try {
    // Risoluzione part_id obbligatorio
    let targetPartId = payload.part_id;
    if (!targetPartId) {
      const partRes = await findOrCreatePart(payload.title, payload.category_id);
      if (partRes.error || !partRes.partId) {
        return { data: null, error: partRes.error || 'Impossibile associare anagrafica al ricambio' };
      }
      targetPartId = partRes.partId;
    }

    const insertData: InventoryInsert = {
      seller_id: sellerId,
      part_id: targetPartId,
      title: payload.title.trim(),
      oem_code: payload.oem_code?.trim() || null,
      internal_code: payload.internal_code?.trim() || null,
      price: Number(payload.price),
      quantity: Math.max(1, Number(payload.quantity || 1)),
      condition: payload.condition || 'buono',
      side: payload.side?.trim() || null,
      position_note: payload.position_note?.trim() || null,
      seller_vehicle_id: payload.seller_vehicle_id || null,
      source_vehicle_id: payload.source_vehicle_id || null,
      description: payload.description?.trim() || null,
      internal_notes: payload.internal_notes?.trim() || null,
      pickup_available: payload.pickup_available ?? true,
      shipping_available: payload.shipping_available ?? true,
      shipping_cost: payload.shipping_cost !== undefined ? Number(payload.shipping_cost) : null,
      status: payload.status || 'available',
      reserved_quantity: 0,
      sold_quantity: 0,
      views: 0,
      is_demo: false,
    };

    const { data, error } = await client
      .from('inventories')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: `Errore salvataggio ricambio: ${error.message}` };
    }

    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione creazione ricambio';
    return { data: null, error: msg };
  }
}

/**
 * Aggiorna i dati di un ricambio a magazzino.
 */
/**
 * Aggiorna i dati di un ricambio a magazzino.
 * Impedisce la pubblicazione online se la giacenza è pari a 0 o negativa.
 * Se la giacenza viene azzerata, imposta automaticamente lo stato a 'sold'.
 */
export async function updateInventoryItem(
  sellerId: string,
  itemId: string,
  updates: Partial<InventoryUpdate>
): Promise<{ data: InventoryItem | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Client Supabase non inizializzato' };
  }

  try {
    // 1. Controllo coerenza disponibilità e giacenza
    if (updates.status === 'available') {
      if (updates.quantity !== undefined && Number(updates.quantity) <= 0) {
        return {
          data: null,
          error: 'Impossibile pubblicare online un ricambio con giacenza pari a 0. Rifornisci prima la disponibilità a magazzino.',
        };
      }
      if (updates.quantity === undefined) {
        // Se la quantità non è nel payload, verificala sul record corrente
        const { data: current } = await client
          .from('inventories')
          .select('quantity')
          .eq('id', itemId)
          .eq('seller_id', sellerId)
          .maybeSingle();

        if (current && (!current.quantity || current.quantity <= 0)) {
          return {
            data: null,
            error: 'Impossibile pubblicare online un ricambio con giacenza pari a 0. Rifornisci prima la disponibilità a magazzino.',
          };
        }
      }
    }

    const payload: Partial<InventoryUpdate> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Se la quantità viene portata a 0 e non è stato impostato esplicitamente un altro stato,
    // imposta automaticamente lo stato su 'sold' per prevenire inserzioni fantasma sul marketplace
    if (updates.quantity !== undefined && Number(updates.quantity) <= 0 && !updates.status) {
      payload.status = 'sold';
    }

    delete (payload as any).seller_id;
    delete (payload as any).id;

    const { data, error } = await client
      .from('inventories')
      .update(payload)
      .eq('id', itemId)
      .eq('seller_id', sellerId)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: `Errore aggiornamento ricambio: ${error.message}` };
    }

    return { data, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione aggiornamento ricambio';
    return { data: null, error: msg };
  }
}

/**
 * Elimina un ricambio dal magazzino.
 */
export async function deleteInventoryItem(
  sellerId: string,
  itemId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Client Supabase non disponibile' };
  }

  try {
    const { error } = await client
      .from('inventories')
      .delete()
      .eq('id', itemId)
      .eq('seller_id', sellerId);

    if (error) {
      return { success: false, error: `Errore eliminazione ricambio: ${error.message}` };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione eliminazione ricambio';
    return { success: false, error: msg };
  }
}

/**
 * Registra uno scarico rapido per vendita al banco / offline.
 * Utilizza la stored function RPC ufficiale `mark_inventory_sold_offline` che garantisce:
 * 1. Controllo di proprietà e autorizzazione lato database (`owns_inventory`)
 * 2. Transazionalità ed esclusione mutua atomica contro race-condition
 * 3. Tracciamento nello storico `inventory_movements` (channel: 'banco', type: 'sale_offline')
 * 4. Aggiornamento automatico dello stato a 'sold' quando la giacenza residua raggiunge 0
 * 
 * Il fallback ad aggiornamento diretto viene attivato ESCLUSIVAMENTE se la funzione RPC non è
 * presente nel database (errore PGRST202), mai su errori di autorizzazione, timeout o vincoli.
 */
export async function markInventorySoldOffline(
  sellerId: string,
  itemId: string,
  quantitySold: number = 1
): Promise<{ data: InventoryItem | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Client Supabase non inizializzato' };
  }

  if (quantitySold <= 0) {
    return { data: null, error: 'La quantità da scaricare deve essere maggiore di zero' };
  }

  try {
    // 1. Verifica preventiva dell'esistenza del ricambio e della giacenza minima
    const { data: current, error: getErr } = await client
      .from('inventories')
      .select('*')
      .eq('id', itemId)
      .eq('seller_id', sellerId)
      .single();

    if (getErr || !current) {
      return { data: null, error: 'Ricambio non trovato o non appartenente al tuo magazzino' };
    }

    if (current.quantity < quantitySold) {
      return {
        data: null,
        error: `Giacenza insufficiente: disponibili ${current.quantity} pz, richiesti ${quantitySold} pz`,
      };
    }

    // 2. Chiamata della stored procedure RPC ufficiale di Autopia
    const { error: rpcError } = await client.rpc('mark_inventory_sold_offline', {
      _inventory_id: itemId,
      _quantity: quantitySold,
      _channel: 'banco',
    });

    if (!rpcError) {
      // Ricarica il record aggiornato dal database
      const { data: reloaded, error: reloadErr } = await client
        .from('inventories')
        .select('*')
        .eq('id', itemId)
        .eq('seller_id', sellerId)
        .single();

      if (reloadErr || !reloaded) {
        return { data: null, error: 'Vendita registrata, errore durante la rilettura del record' };
      }
      return { data: reloaded, error: null };
    }

    // Se l'errore NON è "funzione inesistente" (PGRST202 o 404), NON eseguire il fallback
    // per evitare doppie vendite su errori ambigui (es. timeout o vincoli di business violati)
    const isRpcMissing =
      rpcError.code === 'PGRST202' ||
      rpcError.message?.toLowerCase().includes('function') &&
      rpcError.message?.toLowerCase().includes('does not exist');

    if (!isRpcMissing) {
      return {
        data: null,
        error: `Errore durante la registrazione vendita nel backend: ${rpcError.message}`,
      };
    }

    // 3. Fallback controllato (solo se RPC non censita nel database Supabase)
    // Ricalcola la nuova giacenza garantendo >= 0
    const newQuantity = Math.max(0, current.quantity - quantitySold);
    const newSoldQty = (current.sold_quantity || 0) + quantitySold;
    const newStatus = newQuantity === 0 ? 'sold' : current.status;

    // Aggiornamento atomico su inventories condizionato alla giacenza
    const { data: updatedItem, error: updateErr } = await client
      .from('inventories')
      .update({
        quantity: newQuantity,
        sold_quantity: newSoldQty,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('seller_id', sellerId)
      .gte('quantity', quantitySold) // Protezione da concorrenza: aggiorna solo se la quantità è ancora sufficiente
      .select('*')
      .single();

    if (updateErr) {
      return {
        data: null,
        error: `Errore aggiornamento giacenza: ${updateErr.message}`,
      };
    }

    // Traccia esplicitamente il movimento in inventory_movements per mantenere lo storico
    try {
      await client.from('inventory_movements').insert({
        inventory_id: itemId,
        seller_id: sellerId,
        quantity_delta: -quantitySold,
        type: 'sale_offline',
        sale_channel: 'banco',
        note: `Scarico rapido vendita al banco (${quantitySold} pz)`,
      });
    } catch (movErr) {
      console.warn('Nota: Impossibile inserire record in inventory_movements:', movErr);
    }

    return { data: updatedItem, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione scarico vendita';
    return { data: null, error: msg };
  }
}

export interface BatchImportResult {
  insertedCount: number;
  ignoredCount: number;
  duplicateCount: number;
  errors: string[];
  ignoredDetails: string[];
  duplicateDetails: string[];
}

/**
 * Importazione massiva di ricambi da dati CSV con rilevamento duplicati,
 * righe ignorate ed errori specifici.
 */
export async function batchImportInventory(
  sellerId: string,
  rows: CsvPartRow[]
): Promise<BatchImportResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      insertedCount: 0,
      ignoredCount: 0,
      duplicateCount: 0,
      errors: ['Client Supabase non disponibile'],
      ignoredDetails: [],
      duplicateDetails: [],
    };
  }

  let insertedCount = 0;
  let ignoredCount = 0;
  let duplicateCount = 0;
  const errors: string[] = [];
  const ignoredDetails: string[] = [];
  const duplicateDetails: string[] = [];

  // Recupera categorie per matching nomi
  const { data: categories } = await fetchPartCategories();
  const catMap = new Map<string, string>();
  for (const c of categories || []) {
    catMap.set(c.name.toLowerCase().trim(), c.id);
  }

  // Pre-carica codici OEM e codici interni esistenti dell'autodemolitore per rilevare duplicati nel DB
  const existingOems = new Set<string>();
  const existingInternalCodes = new Set<string>();

  try {
    const { data: existingItems } = await client
      .from('inventories')
      .select('oem_code, internal_code')
      .eq('seller_id', sellerId);

    if (existingItems) {
      for (const item of existingItems) {
        if (item.oem_code) existingOems.add(item.oem_code.trim().toUpperCase());
        if (item.internal_code) existingInternalCodes.add(item.internal_code.trim().toUpperCase());
      }
    }
  } catch (e) {
    console.warn('Nota: controllo duplicati DB parziale:', e);
  }

  const seenInBatchInternals = new Set<string>();
  const seenIdenticalRows = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Controllo righe vuote o senza titolo
    if (!row.title || !row.title.trim()) {
      ignoredCount++;
      ignoredDetails.push(`Riga ${rowNum}: Titolo assente o non valido (riga ignorata)`);
      continue;
    }

    // Controllo duplicati basato su codice interno (matricola unica del demolitore)
    const internalUpper = row.internal_code?.trim().toUpperCase();
    if (internalUpper) {
      if (seenInBatchInternals.has(internalUpper)) {
        duplicateCount++;
        duplicateDetails.push(`Riga ${rowNum}: Codice interno duplicato nel file CSV ("${internalUpper}")`);
        continue;
      }
      if (existingInternalCodes.has(internalUpper)) {
        duplicateCount++;
        duplicateDetails.push(`Riga ${rowNum}: Codice interno già esistente a magazzino ("${internalUpper}")`);
        continue;
      }
    } else {
      // Se il codice interno non è fornito, controlla se l'intera riga è identica a un'altra nello stesso batch
      const rowFingerprint = `${row.title.trim().toLowerCase()}::${row.oem_code?.trim().toUpperCase() || ''}::${Number(row.price) || 0}::${row.condition || ''}::${row.position_note?.trim().toLowerCase() || ''}`;
      if (seenIdenticalRows.has(rowFingerprint)) {
        duplicateCount++;
        duplicateDetails.push(`Riga ${rowNum}: Ricambio duplicato identico nel file CSV ("${row.title}")`);
        continue;
      }
      seenIdenticalRows.add(rowFingerprint);
    }

    try {
      let catId: string | null = null;
      if (row.category_name) {
        catId = catMap.get(row.category_name.toLowerCase().trim()) || null;
      }

      const res = await createInventoryItem(sellerId, {
        title: row.title,
        oem_code: row.oem_code || null,
        internal_code: row.internal_code || null,
        price: Number(row.price) || 0,
        quantity: Math.max(1, Number(row.quantity) || 1),
        condition: row.condition || 'buono',
        side: row.side || null,
        position_note: row.position_note || null,
        description: row.description || null,
        category_id: catId,
        pickup_available: row.pickup_available ?? true,
        shipping_available: row.shipping_available ?? true,
        shipping_cost: row.shipping_cost || 0,
        status: 'available',
      });

      if (res.error) {
        errors.push(`Riga ${rowNum} ("${row.title}"): ${res.error}`);
      } else {
        insertedCount++;
        if (internalUpper) seenInBatchInternals.add(internalUpper);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore inserimento';
      errors.push(`Riga ${rowNum}: ${msg}`);
    }
  }

  return {
    insertedCount,
    ignoredCount,
    duplicateCount,
    errors,
    ignoredDetails,
    duplicateDetails,
  };
}

/**
 * ============================================================================
 * METODI DI AMMINISTRAZIONE PIATTAFORMA AUTOPIA
 * RISERVATI ESCLUSIVAMENTE ALL'ACCOUNT lollogamer2009@gmail.com
 * ============================================================================
 */

/**
 * Recupera l'elenco di tutti gli autodemolitori registrati (per supervisione admin).
 * Blocco di sicurezza rigoroso: rifiutato se l'email non coincide.
 */
export async function fetchAllSellersForAdmin(
  requesterEmail?: string | null
): Promise<{ data: SellerProfile[]; error: string | null }> {
  if (!isUserAdmin(requesterEmail)) {
    return { data: [], error: 'Accesso negato: Funzione riservata esclusivamente all\'amministratore della piattaforma.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  try {
    const { data, error } = await client
      .from('seller_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: `Errore recupero venditori admin: ${error.message}` };
    }

    return { data: data || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura autodemolitori admin';
    return { data: [], error: msg };
  }
}

/**
 * Aggiorna lo stato di approvazione di un venditore (approved, pending, suspended, rejected).
 * Riservato esclusivamente all'account lollogamer2009@gmail.com.
 * Utilizza la stored procedure RPC `admin_review_seller` con fallback ad aggiornamento
 * diretto solo se la RPC non fosse presente nel database.
 */
export async function adminReviewSeller(
  requesterEmail: string | null | undefined,
  sellerId: string,
  status: SellerStatus,
  adminNote?: string | null
): Promise<{ success: boolean; error: string | null }> {
  if (!isUserAdmin(requesterEmail)) {
    return { success: false, error: 'Accesso negato: Operazione consentita esclusivamente all\'amministratore.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Client Supabase non inizializzato' };
  }

  try {
    // 1. Tenta la stored function RPC di Autopia admin_review_seller
    const { error: rpcError } = await client.rpc('admin_review_seller', {
      _seller_id: sellerId,
      _decision: status,
      _note: adminNote?.trim() || '',
    });

    if (!rpcError) {
      return { success: true, error: null };
    }

    // Se l'errore non è "funzione non trovata", restituisci l'errore specifico del database
    const isRpcMissing =
      rpcError.code === 'PGRST202' ||
      rpcError.message?.toLowerCase().includes('function') &&
      rpcError.message?.toLowerCase().includes('does not exist');

    if (!isRpcMissing) {
      return { success: false, error: `Errore revisione venditore: ${rpcError.message}` };
    }

    // 2. Fallback diretto su tabella seller_profiles
    const { error } = await client
      .from('seller_profiles')
      .update({
        status,
        admin_note: adminNote?.trim() || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) {
      return { success: false, error: `Errore revisione venditore: ${error.message}` };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione revisione venditore';
    return { success: false, error: msg };
  }
}

/**
 * Statistiche globali piattaforma per la dashboard amministratore.
 */
export async function fetchAdminPlatformStats(
  requesterEmail?: string | null
): Promise<{
  totalSellers: number;
  approvedSellers: number;
  pendingSellers: number;
  totalInventories: number;
  totalCatalogVehicles: number;
  error: string | null;
}> {
  if (!isUserAdmin(requesterEmail)) {
    return {
      totalSellers: 0,
      approvedSellers: 0,
      pendingSellers: 0,
      totalInventories: 0,
      totalCatalogVehicles: 0,
      error: 'Accesso negato.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      totalSellers: 0,
      approvedSellers: 0,
      pendingSellers: 0,
      totalInventories: 0,
      totalCatalogVehicles: 0,
      error: 'Client non inizializzato',
    };
  }

  try {
    const [sellersRes, invRes, vehRes] = await Promise.all([
      client.from('seller_profiles').select('status', { count: 'exact' }),
      client.from('inventories').select('*', { count: 'exact', head: true }),
      client.from('vehicles').select('*', { count: 'exact', head: true }),
    ]);

    const sellers = sellersRes.data || [];
    const approved = sellers.filter((s) => s.status === 'approved').length;
    const pending = sellers.filter((s) => s.status === 'pending').length;

    return {
      totalSellers: sellersRes.count || sellers.length,
      approvedSellers: approved,
      pendingSellers: pending,
      totalInventories: invRes.count || 0,
      totalCatalogVehicles: vehRes.count || 0,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura statistiche admin';
    return {
      totalSellers: 0,
      approvedSellers: 0,
      pendingSellers: 0,
      totalInventories: 0,
      totalCatalogVehicles: 0,
      error: msg,
    };
  }
}
