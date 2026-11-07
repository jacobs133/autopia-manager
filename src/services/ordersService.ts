import { getSupabaseClient } from './supabaseClient';
import type { Database } from '../types/database.types';

export type PurchaseRequestRow = Database['public']['Tables']['purchase_requests']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];

export interface EnrichedPurchaseRequest extends PurchaseRequestRow {
  inventory?: {
    id: string;
    title: string;
    price: number;
    oem_code: string | null;
    internal_code: string | null;
    condition: string;
    quantity: number;
    status: string;
    position_note: string | null;
    seller_vehicle_id: string | null;
    seller_vehicles?: {
      make: string;
      model: string;
      version: string | null;
      plate: string | null;
    } | null;
  } | null;
  buyer_profile?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    city: string | null;
  } | null;
}

export interface EnrichedOrder extends OrderRow {
  inventory?: {
    id: string;
    title: string;
    price: number;
    oem_code: string | null;
    internal_code: string | null;
    condition: string;
    quantity: number;
    status: string;
    position_note: string | null;
  } | null;
  buyer_profile?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    city: string | null;
  } | null;
}

export interface OrdersFilterOptions {
  status?: string; // 'all' | 'pending' | 'confirmed' | 'paid' | 'shipped' | 'completed' | 'rejected'
  search?: string;
  source?: 'all' | 'requests' | 'orders' | 'ebay';
}

/**
 * Recupera le richieste di acquisto ricevute dai clienti su Autopia Shop per l'autodemolitore.
 */
export async function fetchSellerPurchaseRequests(sellerId: string): Promise<{
  data: EnrichedPurchaseRequest[];
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  try {
    const { data, error } = await client
      .from('purchase_requests')
      .select(`
        *,
        inventory:inventories (
          id,
          title,
          price,
          oem_code,
          internal_code,
          condition,
          quantity,
          status,
          position_note,
          seller_vehicle_id,
          seller_vehicles:seller_vehicles (
            make,
            model,
            version,
            plate
          )
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ordersService] Errore caricamento purchase_requests:', error);
      return { data: [], error: error.message };
    }

    const requests = (data || []) as EnrichedPurchaseRequest[];

    // Raccoglie i buyer_id unici per arricchire con i profili
    const buyerIds = Array.from(new Set(requests.map((r) => r.buyer_id).filter(Boolean)));
    if (buyerIds.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, full_name, phone, city')
        .in('id', buyerIds);

      if (profiles && profiles.length > 0) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        requests.forEach((r) => {
          if (r.buyer_id && profileMap.has(r.buyer_id)) {
            r.buyer_profile = profileMap.get(r.buyer_id) || null;
          }
        });
      }
    }

    return { data: requests, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura richieste di acquisto';
    return { data: [], error: msg };
  }
}

/**
 * Recupera gli ordini confermati/pagati per l'autodemolitore su Autopia Shop.
 */
export async function fetchSellerOrders(sellerId: string): Promise<{
  data: EnrichedOrder[];
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Client Supabase non inizializzato' };
  }

  try {
    const { data, error } = await client
      .from('orders')
      .select(`
        *,
        inventory:inventories (
          id,
          title,
          price,
          oem_code,
          internal_code,
          condition,
          quantity,
          status,
          position_note
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ordersService] Errore caricamento orders:', error);
      return { data: [], error: error.message };
    }

    const orders = (data || []) as EnrichedOrder[];

    // Arricchisce i profili acquirenti
    const buyerIds = Array.from(new Set(orders.map((o) => o.buyer_id).filter(Boolean)));
    if (buyerIds.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, full_name, phone, city')
        .in('id', buyerIds);

      if (profiles && profiles.length > 0) {
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        orders.forEach((o) => {
          if (o.buyer_id && profileMap.has(o.buyer_id)) {
            o.buyer_profile = profileMap.get(o.buyer_id) || null;
          }
        });
      }
    }

    return { data: orders, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eccezione lettura ordini';
    return { data: [], error: msg };
  }
}

/**
 * Conferma una richiesta di acquisto da parte del demolitore.
 * Verifica la disponibilità del ricambio e lo riserva.
 */
export async function confirmPurchaseRequest(
  sellerId: string,
  requestId: string,
  inventoryId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client Supabase non inizializzato' };

  try {
    const now = new Date().toISOString();

    const { error: reqErr } = await client
      .from('purchase_requests')
      .update({
        status: 'confirmed',
        seller_confirmed_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('seller_id', sellerId);

    if (reqErr) {
      return { success: false, error: reqErr.message };
    }

    // Riserva lo stato del ricambio per evitare doppie vendite
    await client
      .from('inventories')
      .update({
        status: 'reserved',
        updated_at: now,
      })
      .eq('id', inventoryId)
      .eq('seller_id', sellerId)
      .eq('status', 'available');

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore durante la conferma della richiesta';
    return { success: false, error: msg };
  }
}

/**
 * Rifiuta una richiesta di acquisto con motivazione opzionale.
 */
export async function rejectPurchaseRequest(
  sellerId: string,
  requestId: string,
  reason: string,
  note?: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client Supabase non inizializzato' };

  try {
    const now = new Date().toISOString();

    const { error } = await client
      .from('purchase_requests')
      .update({
        status: 'rejected',
        seller_rejected_at: now,
        rejection_reason: reason,
        rejection_note: note || null,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('seller_id', sellerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore rifiuto richiesta';
    return { success: false, error: msg };
  }
}

/**
 * Aggiorna lo stato di spedizione / evasione di un ordine confermato.
 */
export async function updateOrderFulfillment(
  sellerId: string,
  orderId: string,
  status: 'processing' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'completed',
  trackingNumber?: string,
  carrier?: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client Supabase non inizializzato' };

  try {
    const now = new Date().toISOString();
    type OrderUpdatePayload = Database['public']['Tables']['orders']['Update'];
    const updatePayload: OrderUpdatePayload = {
      fulfillment_status: status,
      updated_at: now,
    };

    if (trackingNumber) updatePayload.tracking_number = trackingNumber;
    if (carrier) updatePayload.carrier = carrier;
    if (status === 'shipped') {
      updatePayload.shipped_at = now;
      updatePayload.status = 'shipped';
    } else if (status === 'completed' || status === 'delivered') {
      updatePayload.status = 'completed';
    }

    const { error } = await client
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .eq('seller_id', sellerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore aggiornamento evasione ordine';
    return { success: false, error: msg };
  }
}
