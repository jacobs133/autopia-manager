import { getSupabaseClient } from './supabaseClient';
import type {
  SellerVehicle,
  SellerVehicleInsert,
  SellerVehicleUpdate,
  CatalogVehicle,
  VehicleFilters,
  CatalogMakeInfo,
  CatalogBrowseFilters,
  CatalogCacheStats,
} from '../types/vehicles';

export interface FetchVehiclesParams {
  sellerId: string;
  filters: VehicleFilters;
  page: number;
  pageSize: number;
}

export interface FetchVehiclesResponse {
  data: SellerVehicle[];
  totalCount: number;
  error: string | null;
}

/**
 * Recupera l'elenco paginato dei veicoli demoliti per il sellerId autenticato.
 * Include filtri lato server (ricerca testuale su make, model, targa, VIN e filtri per anno e stato).
 */
export async function fetchSellerVehicles(params: FetchVehiclesParams): Promise<FetchVehiclesResponse> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], totalCount: 0, error: 'Client Supabase non inizializzato' };
  }

  try {
    const { sellerId, filters, page, pageSize } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('seller_vehicles')
      .select('*', { count: 'exact' })
      .eq('seller_id', sellerId);

    // Filtro di ricerca testuale (Marca, Modello, Targa, VIN, Versione)
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      query = query.or(
        `make.ilike.%${term}%,model.ilike.%${term}%,plate.ilike.%${term}%,vin.ilike.%${term}%,version.ilike.%${term}%`
      );
    }

    // Filtro per stato veicolo
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Filtro per anno di immatricolazione
    if (filters.year) {
      query = query.eq('year', filters.year);
    }

    // Filtro per tipo di carburante
    if (filters.fuelType && filters.fuelType !== 'all') {
      query = query.eq('fuel_type', filters.fuelType);
    }

    // Ordinamento: veicoli arrivati più di recente per primi
    query = query
      .order('arrival_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return {
        data: [],
        totalCount: 0,
        error: `Errore caricamento veicoli: ${error.message}`,
      };
    }

    return {
      data: data || [],
      totalCount: count || 0,
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      totalCount: 0,
      error: err?.message || 'Eccezione imprevista durante il caricamento dei veicoli',
    };
  }
}

/**
 * Registra un nuovo veicolo demolito in seller_vehicles associato al sellerId autenticato.
 */
export async function createSellerVehicle(
  sellerId: string,
  vehicle: Omit<SellerVehicleInsert, 'seller_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: SellerVehicle | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Client Supabase non disponibile' };
  }

  // Validazione campi obbligatori
  if (!vehicle.make || !vehicle.make.trim()) {
    return { data: null, error: 'La marca del veicolo è obbligatoria' };
  }
  if (!vehicle.model || !vehicle.model.trim()) {
    return { data: null, error: 'Il modello del veicolo è obbligatorio' };
  }

  try {
    const payload: SellerVehicleInsert = {
      seller_id: sellerId,
      make: vehicle.make.trim(),
      model: vehicle.model.trim(),
      version: vehicle.version?.trim() || null,
      generation: vehicle.generation?.trim() || null,
      year: vehicle.year ? Number(vehicle.year) : null,
      plate: vehicle.plate ? vehicle.plate.trim().toUpperCase() : null,
      vin: vehicle.vin ? vehicle.vin.trim().toUpperCase() : null,
      arrival_date: vehicle.arrival_date || new Date().toISOString().split('T')[0],
      location: vehicle.location?.trim() || null,
      status: vehicle.status?.trim() || 'in_attesa',
      engine: vehicle.engine?.trim() || null,
      power: vehicle.power?.trim() || null,
      fuel_type: vehicle.fuel_type?.trim() || null,
      transmission: vehicle.transmission?.trim() || null,
      body_style: vehicle.body_style?.trim() || null,
      notes: vehicle.notes?.trim() || null,
      photo_url: vehicle.photo_url?.trim() || null,
      catalog_vehicle_id: vehicle.catalog_vehicle_id || null,
    };

    const { data, error } = await client
      .from('seller_vehicles')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: `Errore salvataggio veicolo: ${error.message}` };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Eccezione durante la creazione del veicolo' };
  }
}

/**
 * Aggiorna i dati di un veicolo demolito esistente verificando l'appartenenza al sellerId.
 */
export async function updateSellerVehicle(
  sellerId: string,
  vehicleId: string,
  updates: Partial<SellerVehicleUpdate>
): Promise<{ data: SellerVehicle | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Client Supabase non disponibile' };
  }

  if (updates.make !== undefined && !updates.make?.trim()) {
    return { data: null, error: 'La marca del veicolo non può essere vuota' };
  }
  if (updates.model !== undefined && !updates.model?.trim()) {
    return { data: null, error: 'Il modello del veicolo non può essere vuoto' };
  }

  try {
    const payload: Partial<SellerVehicleUpdate> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Assicura formattazione corretta dei codici identificativi
    if (payload.plate) payload.plate = payload.plate.trim().toUpperCase();
    if (payload.vin) payload.vin = payload.vin.trim().toUpperCase();
    if (payload.make) payload.make = payload.make.trim();
    if (payload.model) payload.model = payload.model.trim();

    // Rimuove seller_id dalle modifiche per impedire riassegnazioni di proprietà
    delete (payload as any).seller_id;
    delete (payload as any).id;

    const { data, error } = await client
      .from('seller_vehicles')
      .update(payload)
      .eq('id', vehicleId)
      .eq('seller_id', sellerId)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: `Errore modifica veicolo: ${error.message}` };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Eccezione durante l\'aggiornamento del veicolo' };
  }
}

/**
 * Verifica se un veicolo ha ricambi associati nella tabella inventories.
 * Serve per impedire eliminazioni accidentali che romperebbero l'integrità referenziale.
 */
export async function checkVehicleLinkedParts(
  vehicleId: string
): Promise<{ hasLinkedParts: boolean; count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { hasLinkedParts: false, count: 0, error: 'Client Supabase non disponibile' };
  }

  try {
    const { count, error } = await client
      .from('inventories')
      .select('id', { count: 'exact', head: true })
      .eq('seller_vehicle_id', vehicleId);

    if (error) {
      return { hasLinkedParts: false, count: 0, error: error.message };
    }

    return {
      hasLinkedParts: (count || 0) > 0,
      count: count || 0,
      error: null,
    };
  } catch (err: any) {
    return {
      hasLinkedParts: false,
      count: 0,
      error: err?.message || 'Errore durante la verifica dei ricambi collegati',
    };
  }
}

/**
 * Eliminazione sicura di un veicolo:
 * 1. Verifica preventiva se esistono ricambi collegati in inventories.
 * 2. Se presenti, blocca l'operazione spiegando il motivo.
 * 3. Se nessun ricambio è collegato, esegue l'eliminazione verificando seller_id.
 */
export async function deleteSellerVehicle(
  sellerId: string,
  vehicleId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Client Supabase non disponibile' };
  }

  try {
    // 1. Controllo referenze ricambi
    const { hasLinkedParts, count, error: checkError } = await checkVehicleLinkedParts(vehicleId);
    if (checkError) {
      return {
        success: false,
        error: `Impossibile verificare l'integrità del catalogo: ${checkError}`,
      };
    }

    if (hasLinkedParts) {
      return {
        success: false,
        error: `Impossibile eliminare questo veicolo: risultano collegati ${count} ricambi a magazzino. Per tutelare i dati di vendita, dissocia o elimina prima i ricambi collegati.`,
      };
    }

    // 2. Esecuzione DELETE sicura vincolata al sellerId
    const { error: deleteError } = await client
      .from('seller_vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('seller_id', sellerId);

    if (deleteError) {
      return {
        success: false,
        error: `Errore eliminazione veicolo: ${deleteError.message}`,
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Eccezione imprevista durante l\'eliminazione del veicolo',
    };
  }
}

/**
 * ============================================================================
 * METODI CATALOGO CENTRALE AUTOPIA (public.vehicles)
 * ============================================================================
 * Gestisce l'accesso alla banca dati centralizzata di 11.346 veicoli ufficiali.
 * Risolve i problemi di troncamento (limit 1000/200 di PostgREST),
 * garantisce paginazione completa, deduplicazione canonica e caching in-memory.
 */

// Cache interna in-memory con TTL di 10 minuti per evitare chiamate ripetute
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CatalogCacheData {
  totalCount: number | null;
  totalCountTimestamp: number;
  makes: string[] | null;
  makeDetails: CatalogMakeInfo[] | null;
  makesTimestamp: number;
  modelsByMake: Map<string, { models: string[]; timestamp: number }>;
  generationsByModel: Map<string, { generations: string[]; timestamp: number }>;
  variantsCache: Map<string, { variants: CatalogVehicle[]; timestamp: number }>;
  lastFetched: string | null;
}

const catalogCache: CatalogCacheData = {
  totalCount: null,
  totalCountTimestamp: 0,
  makes: null,
  makeDetails: null,
  makesTimestamp: 0,
  modelsByMake: new Map(),
  generationsByModel: new Map(),
  variantsCache: new Map(),
  lastFetched: null,
};

/**
 * Mappatura canonica delle marche per gestire discrepanze di maiuscole o caratteri
 * (es. 'mazda' -> 'Mazda', 'Skoda' -> 'Škoda', 'Mini' -> 'MINI', 'DR' <-> 'DR Automobiles').
 */
const CANONICAL_MAKE_MAP: Record<string, string> = {
  mazda: 'Mazda',
  mini: 'MINI',
  skoda: 'Škoda',
  dr: 'DR Automobiles',
  'dr automobiles': 'DR Automobiles',
};

function getCanonicalMakeName(rawMake: string): string {
  const trimmed = rawMake.trim();
  const lower = trimmed.toLowerCase();
  return CANONICAL_MAKE_MAP[lower] || trimmed;
}

/**
 * Restituisce i valori grezzi presenti nel database per una data marca canonica.
 */
function getRawMakeValues(canonicalMake: string): string[] {
  const match = catalogCache.makeDetails?.find(
    (d) => d.name.toLowerCase() === canonicalMake.toLowerCase()
  );
  if (match && match.rawValues.length > 0) {
    return match.rawValues;
  }
  const lower = canonicalMake.toLowerCase();
  if (lower === 'mazda') return ['Mazda', 'mazda'];
  if (lower === 'mini') return ['MINI', 'Mini'];
  if (lower === 'škoda' || lower === 'skoda') return ['Škoda', 'Skoda'];
  if (lower === 'dr' || lower === 'dr automobiles') return ['DR', 'DR Automobiles'];
  return [canonicalMake];
}

/**
 * Svuota la cache locale in memoria del catalogo veicoli.
 */
export function clearCatalogCache(): void {
  catalogCache.totalCount = null;
  catalogCache.totalCountTimestamp = 0;
  catalogCache.makes = null;
  catalogCache.makeDetails = null;
  catalogCache.makesTimestamp = 0;
  catalogCache.modelsByMake.clear();
  catalogCache.generationsByModel.clear();
  catalogCache.variantsCache.clear();
  catalogCache.lastFetched = null;
}

/**
 * Restituisce statistiche sullo stato della cache del catalogo.
 */
export function getCatalogCacheStats(): CatalogCacheStats {
  return {
    totalVehicles: catalogCache.totalCount || 0,
    totalMakes: catalogCache.makes?.length || 0,
    isCached: Boolean(catalogCache.makes && catalogCache.makes.length > 0),
    lastFetched: catalogCache.lastFetched,
  };
}

/**
 * Recupera il conteggio esatto in tempo reale dei veicoli nella tabella public.vehicles.
 */
export async function fetchCatalogTotalCount(
  forceRefresh = false
): Promise<{ count: number; error: string | null }> {
  const now = Date.now();
  if (!forceRefresh && catalogCache.totalCount !== null && now - catalogCache.totalCountTimestamp < CACHE_TTL_MS) {
    return { count: catalogCache.totalCount, error: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { count: catalogCache.totalCount || 0, error: 'Client Supabase non inizializzato' };
  }

  try {
    const { count, error } = await client
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        count: catalogCache.totalCount || 0,
        error: `Errore lettura conteggio catalogo: ${error.message}`,
      };
    }

    const total = count || 0;
    catalogCache.totalCount = total;
    catalogCache.totalCountTimestamp = now;
    return { count: total, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura conteggio catalogo';
    return { count: catalogCache.totalCount || 0, error: msg };
  }
}

/**
 * Recupera l'elenco completo di TUTTE le marche disponibili nel catalogo centrale.
 * Risolve il limite delle 1000 righe di PostgREST paginando l'intera tabella in parallelo,
 * deduplicando le marche in modo canonico (gestendo casi come Mazda/mazda e Škoda/Skoda).
 */
export async function fetchCatalogMakes(options?: {
  search?: string;
  forceRefresh?: boolean;
}): Promise<{ data: string[]; details: CatalogMakeInfo[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], details: [], error: 'Client Supabase non inizializzato' };
  }

  const now = Date.now();
  const isCacheValid =
    !options?.forceRefresh &&
    catalogCache.makes !== null &&
    catalogCache.makeDetails !== null &&
    now - catalogCache.makesTimestamp < CACHE_TTL_MS;

  if (isCacheValid && catalogCache.makes && catalogCache.makeDetails) {
    let result = catalogCache.makes;
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter((m) => m.toLowerCase().includes(q));
    }
    return { data: result, details: catalogCache.makeDetails, error: null };
  }

  try {
    // 1. Determina il numero totale di record presenti nella tabella
    const { count: totalVehiclesCount, error: countErr } = await client
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      return {
        data: [],
        details: [],
        error: `Errore verifica catalogo veicoli: ${countErr.message}`,
      };
    }

    const totalCount = totalVehiclesCount || 0;
    catalogCache.totalCount = totalCount;
    catalogCache.totalCountTimestamp = now;

    // 2. Scarica in parallelo tutti i batch di righe (batch da 1000 righe)
    const batchSize = 1000;
    const numBatches = Math.max(1, Math.ceil(totalCount / batchSize));

    const promises = [];
    for (let i = 0; i < numBatches; i++) {
      const from = i * batchSize;
      const to = from + batchSize - 1;
      promises.push(
        client
          .from('vehicles')
          .select('make')
          .range(from, to)
      );
    }

    const responses = await Promise.all(promises);

    // 3. Raggruppa e deduplica canonicamente
    const canonicalMap = new Map<string, { count: number; rawSet: Set<string> }>();

    for (const res of responses) {
      if (res.error) {
        throw new Error(res.error.message);
      }
      if (res.data) {
        for (const row of res.data) {
          const raw = row.make?.trim();
          if (!raw) continue;
          const canonical = getCanonicalMakeName(raw);
          if (!canonicalMap.has(canonical)) {
            canonicalMap.set(canonical, { count: 0, rawSet: new Set() });
          }
          const entry = canonicalMap.get(canonical)!;
          entry.count++;
          entry.rawSet.add(raw);
        }
      }
    }

    const details: CatalogMakeInfo[] = [];
    for (const [canonical, entry] of canonicalMap.entries()) {
      details.push({
        name: canonical,
        count: entry.count,
        rawValues: Array.from(entry.rawSet),
      });
    }

    // Ordinamento alfabetico italiano
    details.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
    const makesList = details.map((d) => d.name);

    // Aggiorna cache
    catalogCache.makes = makesList;
    catalogCache.makeDetails = details;
    catalogCache.makesTimestamp = now;
    catalogCache.lastFetched = new Date().toISOString();

    let filtered = makesList;
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter((m) => m.toLowerCase().includes(q));
    }

    return { data: filtered, details, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Eccezione imprevista caricamento marche catalogo';
    return { data: [], details: [], error: message };
  }
}

/**
 * Recupera TUTTI i modelli distinti appartenenti a una marca specifica dal catalogo centrale.
 * Paginazione completa per marche con più di 1000 varianti (es. Fiat con 1.445 veicoli e VW con 1.078).
 */
export async function fetchCatalogModels(
  make: string,
  options?: {
    search?: string;
    forceRefresh?: boolean;
  }
): Promise<{ data: string[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  const cleanMake = make?.trim();
  if (!cleanMake) {
    return { data: [], error: null };
  }

  const canonical = getCanonicalMakeName(cleanMake);
  const cacheKey = canonical.toLowerCase();
  const now = Date.now();

  const cached = catalogCache.modelsByMake.get(cacheKey);
  if (!options?.forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    let result = cached.models;
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter((m) => m.toLowerCase().includes(q));
    }
    return { data: result, error: null };
  }

  try {
    const rawValues = getRawMakeValues(canonical);

    // 1. Verifica conteggio totale varianti per questa marca
    let countQuery = client
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (rawValues.length === 1) {
      countQuery = countQuery.ilike('make', rawValues[0]);
    } else {
      countQuery = countQuery.in('make', rawValues);
    }

    const { count: makeTotal, error: countErr } = await countQuery;
    if (countErr) {
      return { data: [], error: `Errore verifica modelli per ${make}: ${countErr.message}` };
    }

    const totalForMake = makeTotal || 0;
    const batchSize = 1000;
    const numBatches = Math.max(1, Math.ceil(totalForMake / batchSize));

    // 2. Recupero di tutti i record della marca tramite paginazione
    const promises = [];
    for (let i = 0; i < numBatches; i++) {
      const from = i * batchSize;
      const to = from + batchSize - 1;

      let req = client
        .from('vehicles')
        .select('model')
        .range(from, to);

      if (rawValues.length === 1) {
        req = req.ilike('make', rawValues[0]);
      } else {
        req = req.in('make', rawValues);
      }

      promises.push(req);
    }

    const responses = await Promise.all(promises);

    const modelsSet = new Set<string>();
    for (const res of responses) {
      if (res.error) throw new Error(res.error.message);
      if (res.data) {
        for (const row of res.data) {
          const mod = row.model?.trim();
          if (mod) modelsSet.add(mod);
        }
      }
    }

    const uniqueModels = Array.from(modelsSet).sort((a, b) =>
      a.localeCompare(b, 'it', { sensitivity: 'base' })
    );

    catalogCache.modelsByMake.set(cacheKey, {
      models: uniqueModels,
      timestamp: now,
    });

    let filtered = uniqueModels;
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter((m) => m.toLowerCase().includes(q));
    }

    return { data: filtered, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Eccezione imprevista caricamento modelli';
    return { data: [], error: message };
  }
}

/**
 * Recupera tutte le serie / generazioni disponibili per una determinata marca e modello.
 */
export async function fetchCatalogGenerations(
  make: string,
  model: string,
  options?: { forceRefresh?: boolean }
): Promise<{ data: string[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  if (!make || !model) {
    return { data: [], error: null };
  }

  const cleanMake = make.trim();
  const cleanModel = model.trim();
  const canonical = getCanonicalMakeName(cleanMake);
  const cacheKey = `${canonical.toLowerCase()}::${cleanModel.toLowerCase()}`;
  const now = Date.now();

  const cached = catalogCache.generationsByModel.get(cacheKey);
  if (!options?.forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return { data: cached.generations, error: null };
  }

  try {
    const rawValues = getRawMakeValues(canonical);

    let req = client
      .from('vehicles')
      .select('generation')
      .ilike('model', cleanModel)
      .not('generation', 'is', null)
      .limit(1000);

    if (rawValues.length === 1) {
      req = req.ilike('make', rawValues[0]);
    } else {
      req = req.in('make', rawValues);
    }

    const { data, error } = await req;

    if (error) {
      return {
        data: [],
        error: `Errore caricamento generazioni: ${error.message}`,
      };
    }

    const uniqueGenerations = Array.from(
      new Set(
        (data || [])
          .map((row) => row.generation?.trim())
          .filter((g): g is string => Boolean(g))
      )
    ).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));

    catalogCache.generationsByModel.set(cacheKey, {
      generations: uniqueGenerations,
      timestamp: now,
    });

    return { data: uniqueGenerations, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Eccezione imprevista caricamento generazioni';
    return { data: [], error: message };
  }
}

/**
 * Recupera TUTTE le varianti tecniche (motorizzazioni, carrozzerie, anni) per marca e modello.
 * Elimina qualsiasi limite arbitrario (recuperando ad esempio tutti i 462 allestimenti della Golf).
 */
export async function fetchCatalogVariants(params: {
  make: string;
  model: string;
  generation?: string | null;
  year?: number | null;
  fuelType?: string | null;
  forceRefresh?: boolean;
}): Promise<{ data: CatalogVehicle[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  const { make, model, generation, year, fuelType, forceRefresh } = params;
  if (!make || !model) {
    return { data: [], error: null };
  }

  const cleanMake = make.trim();
  const cleanModel = model.trim();
  const cleanGen = generation?.trim() || '';
  const canonical = getCanonicalMakeName(cleanMake);
  const cacheKey = `${canonical.toLowerCase()}::${cleanModel.toLowerCase()}::${cleanGen.toLowerCase()}::${year || ''}::${fuelType || ''}`;
  const now = Date.now();

  const cached = catalogCache.variantsCache.get(cacheKey);
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return { data: cached.variants, error: null };
  }

  try {
    const rawValues = getRawMakeValues(canonical);

    // 1. Costruzione base query
    let baseQuery = client
      .from('vehicles')
      .select('*', { count: 'exact' })
      .ilike('model', cleanModel);

    if (rawValues.length === 1) {
      baseQuery = baseQuery.ilike('make', rawValues[0]);
    } else {
      baseQuery = baseQuery.in('make', rawValues);
    }

    if (cleanGen) {
      baseQuery = baseQuery.eq('generation', cleanGen);
    }

    if (year && !isNaN(Number(year))) {
      const y = Number(year);
      baseQuery = baseQuery
        .lte('year_from', y)
        .or(`year_to.gte.${y},year_to.is.null`);
    }

    if (fuelType && fuelType !== 'all') {
      baseQuery = baseQuery.ilike('fuel_type', `%${fuelType.trim()}%`);
    }

    // 2. Verifica se il totale supera il limite di una singola pagina (1000)
    const { data: firstPage, count, error: firstErr } = await baseQuery
      .order('year_from', { ascending: false, nullsFirst: false })
      .order('version', { ascending: true })
      .range(0, 999);

    if (firstErr) {
      return {
        data: [],
        error: `Errore caricamento varianti dal catalogo: ${firstErr.message}`,
      };
    }

    let allVariants = firstPage || [];
    const totalCount = count || allVariants.length;

    // Se ci sono più di 1000 varianti (raro per singolo modello, ma gestito compliant)
    if (totalCount > 1000) {
      const batchSize = 1000;
      const numBatches = Math.ceil(totalCount / batchSize);
      const remainingPromises = [];

      for (let i = 1; i < numBatches; i++) {
        const from = i * batchSize;
        const to = from + batchSize - 1;

        let pageReq = client
          .from('vehicles')
          .select('*')
          .ilike('model', cleanModel)
          .range(from, to)
          .order('year_from', { ascending: false, nullsFirst: false })
          .order('version', { ascending: true });

        if (rawValues.length === 1) {
          pageReq = pageReq.ilike('make', rawValues[0]);
        } else {
          pageReq = pageReq.in('make', rawValues);
        }

        if (cleanGen) pageReq = pageReq.eq('generation', cleanGen);
        if (year && !isNaN(Number(year))) {
          const y = Number(year);
          pageReq = pageReq.lte('year_from', y).or(`year_to.gte.${y},year_to.is.null`);
        }
        if (fuelType && fuelType !== 'all') {
          pageReq = pageReq.ilike('fuel_type', `%${fuelType.trim()}%`);
        }

        remainingPromises.push(pageReq);
      }

      const remainingResponses = await Promise.all(remainingPromises);
      for (const res of remainingResponses) {
        if (res.data) allVariants = allVariants.concat(res.data);
      }
    }

    // Deduplicazione per ID primario
    const seenIds = new Set<string>();
    const deduplicatedVariants: CatalogVehicle[] = [];
    for (const v of allVariants) {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id);
        deduplicatedVariants.push(v);
      }
    }

    catalogCache.variantsCache.set(cacheKey, {
      variants: deduplicatedVariants,
      timestamp: now,
    });

    return { data: deduplicatedVariants, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Eccezione imprevista caricamento varianti';
    return { data: [], error: message };
  }
}

/**
 * Esegue una ricerca globale multi-token nel catalogo centrale public.vehicles.
 * Gestisce ricerche multi-parola come "Fiat Panda 1.2", "Golf TDI", "Panda 4x4", o anni come "2018".
 */
export async function searchCatalogVehicles(
  query: string,
  limit: number = 60,
  options?: {
    year?: number | null;
    fuelType?: string | null;
  }
): Promise<{ data: CatalogVehicle[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { data: [], error: null };
  }

  try {
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    let req = client.from('vehicles').select('*');

    // Separa eventuali token a 4 cifre rappresentanti anni (es. 2015, 2018, 1999)
    const textTokens: string[] = [];
    for (const t of tokens) {
      const num = Number(t);
      if (/^\d{4}$/.test(t) && num >= 1950 && num <= 2035) {
        req = req.lte('year_from', num).or(`year_to.gte.${num},year_to.is.null`);
      } else {
        textTokens.push(t);
      }
    }

    // Per ogni token testuale, richiede che corrisponda a uno dei campi informativi principali
    for (const token of textTokens) {
      const sanitized = token.replace(/[%*,\\[\]()":]/g, '').trim();
      if (sanitized) {
        req = req.or(
          `make.ilike.%${sanitized}%,model.ilike.%${sanitized}%,generation.ilike.%${sanitized}%,version.ilike.%${sanitized}%,engine.ilike.%${sanitized}%,power.ilike.%${sanitized}%,fuel_type.ilike.%${sanitized}%,external_vehicle_id.ilike.%${sanitized}%`
        );
      }
    }

    if (options?.year && !isNaN(Number(options.year))) {
      const y = Number(options.year);
      req = req.lte('year_from', y).or(`year_to.gte.${y},year_to.is.null`);
    }

    if (options?.fuelType && options.fuelType !== 'all') {
      req = req.ilike('fuel_type', `%${options.fuelType.trim()}%`);
    }

    const { data, error } = await req
      .order('make', { ascending: true })
      .order('model', { ascending: true })
      .order('year_from', { ascending: false, nullsFirst: false })
      .limit(Math.min(limit, 200));

    if (error) {
      return {
        data: [],
        error: `Errore ricerca catalogo: ${error.message}`,
      };
    }

    // Deduplicazione per ID
    const seen = new Set<string>();
    const unique = (data || []).filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    return { data: unique, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Eccezione imprevista durante la ricerca nel catalogo';
    return { data: [], error: message };
  }
}

/**
 * Navigazione paginata server-side della banca dati completa di 11.346 veicoli.
 * Consente di visualizzare e filtrare l'intero catalogo senza limiti di visualizzazione.
 */
export async function browseCatalogVehicles(params: {
  page: number;
  pageSize: number;
  filters: CatalogBrowseFilters;
}): Promise<{ data: CatalogVehicle[]; totalCount: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], totalCount: 0, error: 'Client Supabase non inizializzato' };
  }

  try {
    const { page, pageSize, filters } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('vehicles')
      .select('*', { count: 'exact' });

    // Filtro Marca (con normalizzazione valori multipli)
    if (filters.make && filters.make.trim()) {
      const canonical = getCanonicalMakeName(filters.make);
      const rawValues = getRawMakeValues(canonical);
      if (rawValues.length === 1) {
        query = query.ilike('make', rawValues[0]);
      } else {
        query = query.in('make', rawValues);
      }
    }

    // Filtro Modello
    if (filters.model && filters.model.trim()) {
      query = query.ilike('model', filters.model.trim());
    }

    // Filtro Generazione
    if (filters.generation && filters.generation.trim()) {
      query = query.eq('generation', filters.generation.trim());
    }

    // Filtro Anno
    if (filters.year && !isNaN(Number(filters.year))) {
      const y = Number(filters.year);
      query = query.lte('year_from', y).or(`year_to.gte.${y},year_to.is.null`);
    }

    // Filtro Carburante
    if (filters.fuelType && filters.fuelType !== 'all') {
      query = query.ilike('fuel_type', `%${filters.fuelType.trim()}%`);
    }

    // Filtro Carrozzeria
    if (filters.bodyStyle && filters.bodyStyle !== 'all') {
      query = query.ilike('body_style', `%${filters.bodyStyle.trim()}%`);
    }

    // Filtro Ricerca libera multi-parola
    if (filters.search && filters.search.trim()) {
      const tokens = filters.search.trim().split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        const sanitized = t.replace(/[%*,\\[\]()":]/g, '').trim();
        if (/^\d{4}$/.test(t) && Number(t) >= 1950 && Number(t) <= 2035) {
          const num = Number(t);
          query = query.lte('year_from', num).or(`year_to.gte.${num},year_to.is.null`);
        } else if (sanitized) {
          query = query.or(
            `make.ilike.%${sanitized}%,model.ilike.%${sanitized}%,generation.ilike.%${sanitized}%,version.ilike.%${sanitized}%,engine.ilike.%${sanitized}%,power.ilike.%${sanitized}%,fuel_type.ilike.%${sanitized}%`
          );
        }
      }
    }

    // Ordinamento
    query = query
      .order('make', { ascending: true })
      .order('model', { ascending: true })
      .order('year_from', { ascending: false, nullsFirst: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return {
        data: [],
        totalCount: 0,
        error: `Errore consultazione catalogo: ${error.message}`,
      };
    }

    return {
      data: data || [],
      totalCount: count || 0,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Eccezione durante la navigazione del catalogo';
    return { data: [], totalCount: 0, error: message };
  }
}

/**
 * Recupera un veicolo dal catalogo centrale public.vehicles tramite il suo ID univoco (UUID),
 * con fallback per external_vehicle_id.
 */
export async function fetchCatalogVehicleById(
  id: string
): Promise<{ data: CatalogVehicle | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Client Supabase non inizializzato' };
  }

  const cleanId = id?.trim();
  if (!cleanId) {
    return { data: null, error: 'ID veicolo catalogo non specificato' };
  }

  try {
    // 1. Ricerca prioritaria per chiave primaria UUID
    const { data, error } = await client
      .from('vehicles')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (!error && data) {
      return { data, error: null };
    }

    // 2. Fallback per external_vehicle_id (se l'identificatore è uno slug legacy)
    const { data: fallbackData, error: fallbackError } = await client
      .from('vehicles')
      .select('*')
      .eq('external_vehicle_id', cleanId)
      .maybeSingle();

    if (fallbackError) {
      return {
        data: null,
        error: `Errore durante la lettura del catalogo: ${fallbackError.message}`,
      };
    }

    return { data: fallbackData || null, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore imprevisto durante la lettura del catalogo';
    return { data: null, error: message };
  }
}

/**
 * Verifica se un veicolo è già presente nel catalogo prima di qualsiasi operazione.
 * Utilizza l'ID UUID come identificatore principale; in alternativa, confronta la combinazione
 * marca, modello, generazione, anno_inizio, motore e versione per evitare duplicati senza unire varianti diverse.
 */
export async function checkVehicleExistsInCatalog(
  candidate: Partial<CatalogVehicle>
): Promise<{ exists: boolean; existingVehicle: CatalogVehicle | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { exists: false, existingVehicle: null, error: 'Client Supabase non disponibile' };
  }

  try {
    // 1. Controllo per ID UUID
    if (candidate.id && candidate.id.trim()) {
      const { data } = await client
        .from('vehicles')
        .select('*')
        .eq('id', candidate.id.trim())
        .maybeSingle();

      if (data) {
        return { exists: true, existingVehicle: data, error: null };
      }
    }

    // 2. Controllo per external_vehicle_id
    if (candidate.external_vehicle_id && candidate.external_vehicle_id.trim()) {
      const { data } = await client
        .from('vehicles')
        .select('*')
        .eq('external_vehicle_id', candidate.external_vehicle_id.trim())
        .maybeSingle();

      if (data) {
        return { exists: true, existingVehicle: data, error: null };
      }
    }

    // 3. Controllo per campi pertinenti combinati (marca, modello, generazione, versione, motore, anno)
    if (candidate.make && candidate.model) {
      let q = client
        .from('vehicles')
        .select('*')
        .ilike('make', candidate.make.trim())
        .ilike('model', candidate.model.trim());

      if (candidate.generation) {
        q = q.eq('generation', candidate.generation.trim());
      }
      if (candidate.version) {
        q = q.eq('version', candidate.version.trim());
      }
      if (candidate.engine) {
        q = q.eq('engine', candidate.engine.trim());
      }
      if (candidate.year_from) {
        q = q.eq('year_from', candidate.year_from);
      }

      const { data } = await q.maybeSingle();
      if (data) {
        return { exists: true, existingVehicle: data, error: null };
      }
    }

    return { exists: false, existingVehicle: null, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore verifica esistenza veicolo';
    return { exists: false, existingVehicle: null, error: msg };
  }
}

