import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getCorsHeaders,
  getSupabaseAdminClient,
  authenticateApprovedSeller,
  getValidEbayAccessToken,
  EBAY_SANDBOX_FULFILLMENT_URL,
  AuthenticationError,
  ForbiddenError,
  DatabaseError,
} from './ebay-shared.mts';

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Metodo HTTP non consentito. Utilizzare POST o GET.' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const { seller } = await authenticateApprovedSeller(authHeader);
    const supabase = getSupabaseAdminClient();

    // =========================================================================
    // GET: RESTITUISCE GLI ORDINI MEMORIZZATI LOCALMENTE
    // =========================================================================
    if (event.httpMethod === 'GET') {
      const { data: orders, error } = await supabase
        .from('ebay_orders')
        .select('*')
        .eq('seller_id', seller.id)
        .order('creation_date', { ascending: false });

      if (error) {
        throw new DatabaseError(`Errore recupero ordini eBay: ${error.message}`);
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          orders: orders || [],
        }),
      };
    }

    // POST: Azioni Operative (Sincronizzazione da eBay o Evasione con Tracking)
    let body: Record<string, any> = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Payload JSON non valido' }),
      };
    }

    const { action } = body;
    const { accessToken } = await getValidEbayAccessToken(seller.id);

    // =========================================================================
    // AZIONE 1: SCARICA E SINCRONIZZA GLI ORDINI DA EBAY FULFILLMENT API (Fase 3C)
    // =========================================================================
    if (action === 'fetch_ebay_orders') {
      // Interroga eBay Fulfillment API per ordini attivi
      const ebayUrl = `${EBAY_SANDBOX_FULFILLMENT_URL}/order?limit=50`;

      const ebayRes = await fetch(ebayUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!ebayRes.ok) {
        const errText = await ebayRes.text();
        console.error('[ebay-orders-sync] Errore richiesta ordini eBay:', errText);
        return {
          statusCode: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `Errore recupero ordini da eBay Fulfillment API: HTTP ${ebayRes.status}`,
            details: errText,
          }),
        };
      }

      const ebayData = await ebayRes.json();
      const rawOrders = Array.isArray(ebayData?.orders) ? ebayData.orders : [];
      const syncedOrders: any[] = [];

      for (const order of rawOrders) {
        const ebayOrderId = order.orderId;
        const buyer = order.buyer || {};
        const pricing = order.pricingSummary || {};
        const fulfillmentStart = order.fulfillmentStartInstructions?.[0] || {};
        const shippingStep = fulfillmentStart.shippingStep || {};
        const shipTo = shippingStep.shipTo || {};

        const totalPrice = parseFloat(pricing.total?.value || '0');
        const currency = pricing.total?.currency || 'EUR';
        const orderStatus = order.orderFulfillmentStatus === 'FULFILLED' ? 'SHIPPED' : 'PAID';
        const creationDate = order.creationDate || new Date().toISOString();

        const lineItems = (order.lineItems || []).map((li: any) => ({
          lineItemId: li.lineItemId,
          sku: li.sku || '',
          title: li.title || 'Ricambio Auto',
          quantity: li.quantity || 1,
          lineItemCost: li.lineItemCost?.value || '0',
        }));

        // Salvataggio atomico nel database Supabase
        const { data: saved, error: upsertErr } = await supabase
          .from('ebay_orders')
          .upsert(
            {
              seller_id: seller.id,
              ebay_order_id: ebayOrderId,
              buyer_username: buyer.username || 'Acquirente eBay',
              buyer_name: shipTo.fullName || buyer.username || 'Cliente',
              shipping_address: shipTo,
              total_price: totalPrice,
              currency,
              order_status: orderStatus,
              line_items: lineItems,
              creation_date: creationDate,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'seller_id,ebay_order_id' }
          )
          .select()
          .single();

        if (!upsertErr && saved) {
          syncedOrders.push(saved);

          // SCARICO AUTOMATICO MAGAZZINO:
          // Se l'ordine è nuovo, decrementa la giacenza corrispondente in `inventories`
          for (const item of lineItems) {
            if (item.sku) {
              const { data: matchedListings } = await supabase
                .from('ebay_listings')
                .select('inventory_id, quantity')
                .eq('seller_id', seller.id)
                .eq('sku', item.sku)
                .maybeSingle();

              if (matchedListings?.inventory_id) {
                // Recupera giacenza attuale
                const { data: invItem } = await supabase
                  .from('inventories')
                  .select('id, quantity')
                  .eq('id', matchedListings.inventory_id)
                  .eq('seller_id', seller.id)
                  .maybeSingle();

                if (invItem && invItem.quantity != null) {
                  const newQty = Math.max(0, invItem.quantity - item.quantity);
                  await supabase
                    .from('inventories')
                    .update({
                      quantity: newQty,
                      status: newQty === 0 ? 'sold' : 'available',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', invItem.id);

                  console.log(`[ebay-orders-sync] Scalata giacenza magazzino per inventory ${invItem.id}: da ${invItem.quantity} a ${newQty}`);
                }
              }
            }
          }
        }
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          count: syncedOrders.length,
          orders: syncedOrders,
          message: `Sincronizzati con successo ${syncedOrders.length} ordini da eBay Sandbox.`,
        }),
      };
    }

    // =========================================================================
    // AZIONE 2: EVASIONE ORDINE CON CODICE DI TRACKING SPEDIZIONE (Fase 3C)
    // =========================================================================
    if (action === 'fulfill_order') {
      const { ebay_order_id, tracking_number, carrier_code } = body;

      if (!ebay_order_id || !tracking_number) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'ebay_order_id e tracking_number sono obbligatori.' }),
        };
      }

      const carrier = carrier_code || 'Altro';
      const fulfillPayload = {
        trackingNumber: tracking_number.trim(),
        shippingCarrierCode: carrier,
      };

      const fulfillRes = await fetch(
        `${EBAY_SANDBOX_FULFILLMENT_URL}/order/${encodeURIComponent(ebay_order_id)}/shipping_fulfillment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fulfillPayload),
        }
      );

      if (!fulfillRes.ok && fulfillRes.status !== 201 && fulfillRes.status !== 200) {
        const errText = await fulfillRes.text();
        console.error('[ebay-orders-sync] Errore inserimento tracking eBay:', errText);
      }

      // Aggiorna lo stato nel database locale
      const nowIso = new Date().toISOString();
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('ebay_orders')
        .update({
          order_status: 'SHIPPED',
          tracking_number: tracking_number.trim(),
          carrier_code: carrier,
          shipped_at: nowIso,
        })
        .eq('seller_id', seller.id)
        .eq('ebay_order_id', ebay_order_id)
        .select()
        .single();

      if (updateErr) {
        throw new DatabaseError(`Errore aggiornamento ordine nel database: ${updateErr.message}`);
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          order: updatedOrder,
          message: `Ordine ${ebay_order_id} contrassegnato come Spedito con tracking ${tracking_number} (${carrier}).`,
        }),
      };
    }

    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Azione '${action}' non riconosciuta.` }),
    };
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return {
        statusCode: err.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      };
    }
    if (err instanceof ForbiddenError) {
      return {
        statusCode: err.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      };
    }

    const msg = err instanceof Error ? err.message : 'Errore imprevisto gestione ordini eBay';
    console.error('[ebay-orders-sync] Eccezione:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: msg }),
    };
  }
};
