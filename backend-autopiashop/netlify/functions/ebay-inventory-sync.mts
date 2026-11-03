import type { Handler, HandlerEvent } from '@netlify/functions';
import {
  getCorsHeaders,
  getSupabaseAdminClient,
  authenticateApprovedSeller,
  getValidEbayAccessToken,
  EBAY_SANDBOX_INVENTORY_URL,
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

    // Se richiesta GET, restituisce le inserzioni eBay del venditore
    if (event.httpMethod === 'GET') {
      const { data: listings, error } = await supabase
        .from('ebay_listings')
        .select('*')
        .eq('seller_id', seller.id)
        .order('last_synced_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`Errore lettura inserzioni eBay: ${error.message}`);
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          listings: listings || [],
        }),
      };
    }

    // Richiesta POST con body JSON
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
    // AZIONE 1: PUBBLICAZIONE NUOVO RICAMBIO SU EBAY SANDBOX (Fase 3B)
    // =========================================================================
    if (action === 'publish_item') {
      const {
        inventory_id,
        sku: customSku,
        title,
        description,
        price,
        quantity,
        condition,
        oem_code,
        brand,
        images,
      } = body;

      if (!title || price == null || quantity == null) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Parametri mancanti: title, price e quantity sono obbligatori.' }),
        };
      }

      const sku = (customSku || `AUT-${inventory_id ? inventory_id.slice(0, 8) : Date.now()}`).toUpperCase().trim();
      const sanitizedTitle = String(title).slice(0, 80);
      const sanitizedPrice = Number(price) > 0 ? Number(price) : 10.0;
      const sanitizedQty = Math.max(0, parseInt(String(quantity), 10) || 1);

      // Mappatura condizioni ricambio Autopia in condizioni eBay Sell API
      let ebayCondition = 'USED_EXCELLENT';
      if (condition === 'ottimo') ebayCondition = 'USED_EXCELLENT';
      else if (condition === 'buono') ebayCondition = 'USED_VERY_GOOD';
      else if (condition === 'discreto') ebayCondition = 'USED_GOOD';
      else if (condition === 'da_revisionare') ebayCondition = 'FOR_PARTS_OR_NOT_WORKING';

      // 1. Creazione o Aggiornamento dell'Inventory Item su eBay
      const inventoryItemPayload = {
        availability: {
          shipToLocationAvailability: {
            quantity: sanitizedQty,
          },
        },
        condition: ebayCondition,
        product: {
          title: sanitizedTitle,
          description: description || `Ricambio auto usato originale: ${sanitizedTitle}. Codice OEM: ${oem_code || 'Verifica compatibilità'}. Spedizione espressa garantita da Autopia.`,
          aspects: {
            'Marca': [brand || 'Originale'],
            'Codice ricambio originale OEM': [oem_code || 'Non applicabile'],
            'Condizione ricambio': [condition || 'Usato garantito'],
          },
          imageUrls: Array.isArray(images) && images.length > 0
            ? images.filter((img) => typeof img === 'string' && img.startsWith('http')).slice(0, 12)
            : ['https://autopiashop.it/placeholder-part.png'],
        },
      };

      const putItemRes = await fetch(`${EBAY_SANDBOX_INVENTORY_URL}/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'it-IT',
        },
        body: JSON.stringify(inventoryItemPayload),
      });

      if (!putItemRes.ok && putItemRes.status !== 204 && putItemRes.status !== 200) {
        const errText = await putItemRes.text();
        console.error('[ebay-inventory-sync] Errore creazione inventory_item:', errText);
        return {
          statusCode: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `Errore creazione ricambio su eBay Inventory API: HTTP ${putItemRes.status}`,
            details: errText,
          }),
        };
      }

      // 2. Creazione dell'Offerta eBay (Offer)
      const offerPayload = {
        sku: sku,
        marketplaceId: 'EBAY_IT',
        format: 'FIXED_PRICE',
        pricingSummary: {
          price: {
            currency: 'EUR',
            value: sanitizedPrice.toFixed(2),
          },
        },
        listingDescription: description || `Ricambio originale: ${sanitizedTitle}. Certificato da Autopia Demolizioni.`,
        availableQuantity: sanitizedQty,
        quantityLimitPerBuyer: 2,
      };

      const createOfferRes = await fetch(`${EBAY_SANDBOX_INVENTORY_URL}/offer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'it-IT',
        },
        body: JSON.stringify(offerPayload),
      });

      let offerId: string | null = null;
      let listingId: string | null = null;

      if (createOfferRes.ok) {
        const offerData = await createOfferRes.json();
        offerId = offerData?.offerId || null;

        // 3. Pubblicazione dell'Offerta su eBay Sandbox
        if (offerId) {
          const publishRes = await fetch(`${EBAY_SANDBOX_INVENTORY_URL}/offer/${offerId}/publish`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (publishRes.ok) {
            const publishData = await publishRes.json();
            listingId = publishData?.listingId || null;
          } else {
            console.warn('[ebay-inventory-sync] Avviso pubblicazione offerta (salvata come bozza):', await publishRes.text());
          }
        }
      } else {
        console.warn('[ebay-inventory-sync] Avviso creazione offerta:', await createOfferRes.text());
      }

      // 4. Salvataggio o aggiornamento nel database `ebay_listings`
      const nowIso = new Date().toISOString();
      const listingStatus = listingId ? 'published' : offerId ? 'draft' : 'pending';

      const { data: savedListing, error: saveErr } = await supabase
        .from('ebay_listings')
        .upsert(
          {
            seller_id: seller.id,
            inventory_id: inventory_id || null,
            sku: sku,
            ebay_item_id: listingId,
            ebay_offer_id: offerId,
            title: sanitizedTitle,
            price: sanitizedPrice,
            quantity: sanitizedQty,
            status: listingStatus,
            last_synced_at: nowIso,
          },
          { onConflict: 'seller_id,sku' }
        )
        .select()
        .single();

      if (saveErr) {
        console.warn('[ebay-inventory-sync] Avviso salvataggio ebay_listings:', saveErr.message);
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          sku,
          offerId,
          listingId,
          status: listingStatus,
          message: listingId
            ? 'Annuncio pubblicato con successo su eBay Sandbox!'
            : 'Articolo creato su eBay Inventory. In attesa di pubblicazione finale.',
          listing: savedListing,
        }),
      };
    }

    // =========================================================================
    // AZIONE 2: SINCRONIZZAZIONE GIACENZE MAGAZZINO (Fase 3B)
    // =========================================================================
    if (action === 'sync_quantity') {
      const { sku, quantity, inventory_id } = body;

      if (!sku || quantity == null) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'SKU e quantità sono obbligatori' }),
        };
      }

      const newQty = Math.max(0, parseInt(String(quantity), 10));

      // Chiamata eBay Inventory API per aggiornare la disponibilità
      const syncRes = await fetch(`${EBAY_SANDBOX_INVENTORY_URL}/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'it-IT',
        },
        body: JSON.stringify({
          availability: {
            shipToLocationAvailability: {
              quantity: newQty,
            },
          },
        }),
      });

      const nowIso = new Date().toISOString();
      const newStatus = newQty === 0 ? 'out_of_stock' : 'published';

      await supabase
        .from('ebay_listings')
        .update({
          quantity: newQty,
          status: newStatus,
          last_synced_at: nowIso,
        })
        .eq('seller_id', seller.id)
        .eq('sku', sku);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          sku,
          quantity: newQty,
          status: newStatus,
          lastSyncedAt: nowIso,
          message: `Giacenza eBay per SKU ${sku} aggiornata a ${newQty} pezzi.`,
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

    const msg = err instanceof Error ? err.message : 'Errore imprevisto sincronizzazione eBay';
    console.error('[ebay-inventory-sync] Eccezione:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: msg }),
    };
  }
};
