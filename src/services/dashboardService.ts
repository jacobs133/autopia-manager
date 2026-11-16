import { getSupabaseClient } from './supabaseClient';
import { fetchEbayConnectionStatus } from './ebayService';

export interface TimeSeriesPoint {
  key: string;
  label: string;
  partsAdded: number;
  vehiclesAdded: number;
  ordersCount: number;
  revenue: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
  units: number;
  valueEur: number;
  percentage: number;
}

export interface OperationalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  targetSection: 'parts' | 'vehicles' | 'orders' | 'listings' | 'ebay' | 'admin' | 'settings';
  count?: number;
}

export interface ActivityFeedItem {
  id: string;
  kind: 'part' | 'vehicle' | 'order' | 'ebay_order' | 'movement';
  title: string;
  subtitle: string;
  timestamp: string;
  amountOrCount?: string;
}

export interface SearchableSummary {
  parts: Array<{
    id: string;
    title: string;
    oem_code: string | null;
    internal_code: string | null;
    position_note: string | null;
    price: number;
    quantity: number;
    status: string;
  }>;
  vehicles: Array<{
    id: string;
    make: string;
    model: string;
    year: number | null;
    plate: string | null;
    vin: string | null;
    status: string;
  }>;
  orders: Array<{
    id: string;
    order_number: string | null;
    total: number;
    fulfillment_status: string;
    created_at: string;
  }>;
}

export interface AdminPlatformOverview {
  totalSellers: number;
  approvedSellers: number;
  pendingSellers: number;
  suspendedSellers: number;
  rejectedSellers: number;
  catalogVehiclesTotal: number;
  recentPendingSellers: Array<{
    id: string;
    business_name: string;
    city: string;
    created_at: string;
  }>;
}

export interface DashboardSnapshot {
  fetchedAt: string;
  kpis: {
    totalPartRecords: number;
    totalStockUnits: number;
    onlineParts: number;
    draftIncompleteParts: number;
    outOfStockOrReservedParts: number;
    warehouseEstimatedValue: number;
    totalSoldUnits: number;
    totalVehicles: number;
    activeDismantlingVehicles: number;
    pendingPurchaseRequests: number;
    paidOrdersToShip: number;
    totalOrdersCount: number;
    grossSalesRevenue: number;
    ebayConnected: boolean;
    ebayUsername: string | null;
    ebayOrdersToShip: number;
    ebayPublishedListings: number;
  };
  availabilityBreakdown: Array<{
    label: string;
    count: number;
    color: string;
  }>;
  categoryDistribution: CategoryDistributionItem[];
  monthlySeries: TimeSeriesPoint[];
  alerts: OperationalAlert[];
  recentActivity: ActivityFeedItem[];
  searchable: SearchableSummary;
  adminOverview: AdminPlatformOverview | null;
}

interface RawPartRow {
  id: string;
  title: string;
  price: number;
  quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  status: string;
  oem_code: string | null;
  internal_code: string | null;
  position_note: string | null;
  created_at: string;
  updated_at: string;
  parts?: {
    name?: string | null;
    part_categories?: {
      name?: string | null;
    } | null;
  } | null;
}

interface RawEbayOrderRow {
  id: string;
  ebay_order_id: string;
  total_price: number | null;
  order_status: string | null;
  creation_date: string;
  buyer_name: string | null;
}

interface RawEbayListingRow {
  id: string;
  status: string | null;
  quantity: number | null;
}

const IT_MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function buildLastSixMonthsBuckets(): Array<{ key: string; label: string }> {
  const now = new Date();
  const buckets: Array<{ key: string; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${IT_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    buckets.push({ key, label });
  }
  return buckets;
}

function getMonthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function fetchDashboardSnapshot(
  sellerId: string,
  isAdmin: boolean
): Promise<{ data: DashboardSnapshot | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: 'Client backend non configurato' };
  }

  try {
    const [
      partsRes,
      vehiclesRes,
      requestsRes,
      ordersRes,
      ebayStatusRes,
      ebayOrdersRes,
      ebayListingsRes,
      movementsRes,
      adminSellersRes,
      catalogCountRes,
    ] = await Promise.all([
      supabase
        .from('inventories')
        .select(
          'id, title, price, quantity, reserved_quantity, sold_quantity, status, oem_code, internal_code, position_note, created_at, updated_at, parts(name, part_categories(name))'
        )
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('seller_vehicles')
        .select('id, make, model, year, plate, vin, status, arrival_date, location, created_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('purchase_requests')
        .select('id, status, quantity, price_at_request, created_at, inventory_id')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('orders')
        .select('id, order_number, total, seller_amount, fulfillment_status, payment_status, status, created_at, tracking_number, sale_channel')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(500),
      fetchEbayConnectionStatus(sellerId).catch(() => ({
        isConnected: false,
        ebayUsername: null,
      })),
      (supabase as any)
        .from('ebay_orders')
        .select('id, ebay_order_id, total_price, order_status, creation_date, buyer_name')
        .eq('seller_id', sellerId)
        .order('creation_date', { ascending: false })
        .limit(200),
      (supabase as any)
        .from('ebay_listings')
        .select('id, status, quantity')
        .eq('seller_id', sellerId)
        .limit(500),
      supabase
        .from('inventory_movements')
        .select('id, type, quantity_delta, sale_channel, note, created_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(25),
      isAdmin
        ? supabase
            .from('seller_profiles')
            .select('id, business_name, city, status, created_at')
            .order('created_at', { ascending: false })
            .limit(300)
        : Promise.resolve({ data: null, error: null }),
      isAdmin
        ? supabase.from('vehicles').select('id', { count: 'exact', head: true })
        : Promise.resolve({ count: null, error: null }),
    ]);

    const parts = ((partsRes.data || []) as unknown) as RawPartRow[];
    const vehicles = vehiclesRes.data || [];
    const requests = requestsRes.data || [];
    const orders = ordersRes.data || [];
    const ebayOrders: RawEbayOrderRow[] = ebayOrdersRes?.error ? [] : (ebayOrdersRes?.data || []);
    const ebayListings: RawEbayListingRow[] = ebayListingsRes?.error ? [] : (ebayListingsRes?.data || []);
    const movements = movementsRes.error ? [] : movementsRes.data || [];

    // KPI Magazzino
    let totalStockUnits = 0;
    let onlineParts = 0;
    let draftIncompleteParts = 0;
    let outOfStockOrReservedParts = 0;
    let warehouseEstimatedValue = 0;
    let totalSoldUnits = 0;

    const categoryMap = new Map<string, { count: number; units: number; valueEur: number }>();

    for (const item of parts) {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      totalStockUnits += qty;
      totalSoldUnits += Number(item.sold_quantity || 0);

      if (qty > 0 && price > 0) {
        warehouseEstimatedValue += qty * price;
      }

      if (item.status === 'available' && qty > 0 && price > 0) {
        onlineParts += 1;
      } else if (item.status === 'inactive' && price <= 0) {
        draftIncompleteParts += 1;
      }

      if (qty <= 0 || item.status === 'reserved' || item.status === 'sold') {
        outOfStockOrReservedParts += 1;
      }

      const catName =
        item.parts?.part_categories?.name ||
        item.parts?.name ||
        'Ricambi Generici';
      const current = categoryMap.get(catName) || { count: 0, units: 0, valueEur: 0 };
      current.count += 1;
      current.units += qty;
      current.valueEur += qty * price;
      categoryMap.set(catName, current);
    }

    const totalPartsLen = parts.length;
    const categoryDistribution: CategoryDistributionItem[] = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        units: stats.units,
        valueEur: stats.valueEur,
        percentage: totalPartsLen > 0 ? Math.round((stats.count / totalPartsLen) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Breakdown disponibilità
    const readyDrafts = parts.filter((p) => p.status === 'inactive' && Number(p.price) > 0 && p.quantity > 0).length;
    const reservedOrSold = parts.filter((p) => p.status === 'reserved' || p.status === 'sold' || p.quantity <= 0).length;
    const availabilityBreakdown = [
      { label: 'Online attivi', count: onlineParts, color: '#074E44' },
      { label: 'Pronti offline', count: readyDrafts, color: '#0D9488' },
      { label: 'Bozze senza prezzo', count: draftIncompleteParts, color: '#D97706' },
      { label: 'Esauriti / Riservati', count: reservedOrSold, color: '#64748B' },
    ];

    // Veicoli
    const activeDismantlingVehicles = vehicles.filter(
      (v) => v.status === 'in_attesa' || v.status === 'bonificato' || v.status === 'in_smontaggio'
    ).length;

    // Ordini & Richieste
    const pendingPurchaseRequests = requests.filter(
      (r) => r.status === 'pending_seller_confirmation'
    ).length;
    const paidOrdersToShip = orders.filter(
      (o) =>
        o.payment_status === 'paid' &&
        (o.fulfillment_status === 'pending' || o.fulfillment_status === 'processing')
    ).length;
    const grossSalesRevenue = orders.reduce(
      (acc, o) => acc + (o.payment_status === 'paid' ? Number(o.seller_amount || o.total || 0) : 0),
      0
    );

    const ebayOrdersToShip = ebayOrders.filter((eo) => eo.order_status !== 'SHIPPED').length;
    const ebayPublishedListings = ebayListings.filter((el) => el.status === 'published').length;

    // Serie storica mensile ultimi 6 mesi (100% dati reali)
    const buckets = buildLastSixMonthsBuckets();
    const bucketMap = new Map<string, TimeSeriesPoint>();
    for (const b of buckets) {
      bucketMap.set(b.key, {
        key: b.key,
        label: b.label,
        partsAdded: 0,
        vehiclesAdded: 0,
        ordersCount: 0,
        revenue: 0,
      });
    }

    for (const p of parts) {
      const k = getMonthKey(p.created_at);
      if (k && bucketMap.has(k)) {
        bucketMap.get(k)!.partsAdded += 1;
      }
    }
    for (const v of vehicles) {
      const k = getMonthKey(v.created_at);
      if (k && bucketMap.has(k)) {
        bucketMap.get(k)!.vehiclesAdded += 1;
      }
    }
    for (const o of orders) {
      const k = getMonthKey(o.created_at);
      if (k && bucketMap.has(k)) {
        const pt = bucketMap.get(k)!;
        pt.ordersCount += 1;
        if (o.payment_status === 'paid') {
          pt.revenue += Number(o.seller_amount || o.total || 0);
        }
      }
    }

    const monthlySeries = Array.from(bucketMap.values());

    // Admin overview
    let adminOverview: AdminPlatformOverview | null = null;
    if (isAdmin && adminSellersRes.data) {
      const allSellers = adminSellersRes.data;
      const pendingList = allSellers.filter((s) => s.status === 'pending');
      adminOverview = {
        totalSellers: allSellers.length,
        approvedSellers: allSellers.filter((s) => s.status === 'approved').length,
        pendingSellers: pendingList.length,
        suspendedSellers: allSellers.filter((s) => s.status === 'suspended').length,
        rejectedSellers: allSellers.filter((s) => s.status === 'rejected').length,
        catalogVehiclesTotal: catalogCountRes.count ?? 0,
        recentPendingSellers: pendingList.slice(0, 5).map((s) => ({
          id: s.id,
          business_name: s.business_name,
          city: s.city,
          created_at: s.created_at,
        })),
      };
    }

    // Centro Azioni & Avvisi Reali
    const alerts: OperationalAlert[] = [];

    if (pendingPurchaseRequests > 0) {
      alerts.push({
        id: 'pending-requests',
        severity: 'critical',
        title: `${pendingPurchaseRequests} richiest${pendingPurchaseRequests === 1 ? 'a' : 'e'} di acquisto da confermare`,
        description: 'Conferma o rifiuta la disponibilità in magazzino per sbloccare il pagamento cliente.',
        targetSection: 'orders',
        count: pendingPurchaseRequests,
      });
    }

    if (paidOrdersToShip > 0) {
      alerts.push({
        id: 'orders-to-ship',
        severity: 'warning',
        title: `${paidOrdersToShip} ordin${paidOrdersToShip === 1 ? 'e pagato' : 'i pagati'} in attesa di spedizione`,
        description: 'Inserisci corriere e codice di tracking per completare l’evasione.',
        targetSection: 'orders',
        count: paidOrdersToShip,
      });
    }

    if (ebayOrdersToShip > 0) {
      alerts.push({
        id: 'ebay-orders-to-ship',
        severity: 'warning',
        title: `${ebayOrdersToShip} ordin${ebayOrdersToShip === 1 ? 'e eBay' : 'i eBay'} da evadere`,
        description: 'Registra il tracking sul canale eBay per aggiornare lo stato spedizione.',
        targetSection: 'ebay',
        count: ebayOrdersToShip,
      });
    }

    if (draftIncompleteParts > 0) {
      alerts.push({
        id: 'incomplete-drafts',
        severity: 'info',
        title: `${draftIncompleteParts} bozz${draftIncompleteParts === 1 ? 'a' : 'e'} ricambi senza prezzo di vendita`,
        description: 'Completa prezzo e condizioni per pubblicare i pezzi su Autopia Shop.',
        targetSection: 'parts',
        count: draftIncompleteParts,
      });
    }

    const zeroStockOnline = parts.filter((p) => p.status === 'available' && p.quantity <= 0).length;
    if (zeroStockOnline > 0) {
      alerts.push({
        id: 'zero-stock-online',
        severity: 'warning',
        title: `${zeroStockOnline} annunc${zeroStockOnline === 1 ? 'io attivo' : 'i attivi'} con giacenza 0 pz`,
        description: 'Verifica la disponibilità fisica o imposta offline gli articoli esauriti.',
        targetSection: 'listings',
        count: zeroStockOnline,
      });
    }

    if (isAdmin && adminOverview && adminOverview.pendingSellers > 0) {
      alerts.push({
        id: 'admin-pending-sellers',
        severity: 'warning',
        title: `${adminOverview.pendingSellers} autodemolitor${adminOverview.pendingSellers === 1 ? 'e' : 'i'} in attesa di approvazione`,
        description: 'Esamina le nuove richieste di attivazione nell’area Amministrazione.',
        targetSection: 'admin',
        count: adminOverview.pendingSellers,
      });
    }

    // Timeline Attività Reale
    const feed: ActivityFeedItem[] = [];

    for (const o of orders.slice(0, 6)) {
      feed.push({
        id: `ord-${o.id}`,
        kind: 'order',
        title: `Ordine #${o.order_number || o.id.slice(0, 8)}`,
        subtitle: `Pagamento: ${o.payment_status} · Spedizione: ${o.fulfillment_status}`,
        timestamp: o.created_at,
        amountOrCount: `€ ${Number(o.seller_amount || o.total || 0).toFixed(2)}`,
      });
    }

    for (const eo of ebayOrders.slice(0, 4)) {
      feed.push({
        id: `ebay-${eo.id}`,
        kind: 'ebay_order',
        title: `Ordine eBay #${eo.ebay_order_id}`,
        subtitle: `${eo.buyer_name || 'Acquirente eBay'} · ${eo.order_status || 'In lavorazione'}`,
        timestamp: eo.creation_date,
        amountOrCount: `€ ${Number(eo.total_price || 0).toFixed(2)}`,
      });
    }

    for (const m of movements.slice(0, 5)) {
      feed.push({
        id: `mov-${m.id}`,
        kind: 'movement',
        title: `Movimento ${m.type}`,
        subtitle: m.note || m.sale_channel || 'Aggiornamento giacenza',
        timestamp: m.created_at,
        amountOrCount: `${m.quantity_delta > 0 ? '+' : ''}${m.quantity_delta} pz`,
      });
    }

    for (const v of vehicles.slice(0, 5)) {
      feed.push({
        id: `veh-${v.id}`,
        kind: 'vehicle',
        title: `${v.make} ${v.model}${v.year ? ` (${v.year})` : ''}`,
        subtitle: `${v.plate ? `Targa ${v.plate}` : 'Senza targa'} · Stato: ${v.status}`,
        timestamp: v.created_at,
      });
    }

    for (const p of parts.slice(0, 6)) {
      feed.push({
        id: `prt-${p.id}`,
        kind: 'part',
        title: p.title,
        subtitle: `${p.oem_code ? `OEM ${p.oem_code}` : 'Senza OEM'} · ${p.quantity} pz`,
        timestamp: p.created_at,
        amountOrCount: p.price > 0 ? `€ ${Number(p.price).toFixed(2)}` : 'Bozza',
      });
    }

    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      data: {
        fetchedAt: new Date().toISOString(),
        kpis: {
          totalPartRecords: parts.length,
          totalStockUnits,
          onlineParts,
          draftIncompleteParts,
          outOfStockOrReservedParts,
          warehouseEstimatedValue,
          totalSoldUnits,
          totalVehicles: vehicles.length,
          activeDismantlingVehicles,
          pendingPurchaseRequests,
          paidOrdersToShip,
          totalOrdersCount: orders.length,
          grossSalesRevenue,
          ebayConnected: Boolean(ebayStatusRes?.isConnected),
          ebayUsername: ebayStatusRes?.ebayUsername || null,
          ebayOrdersToShip,
          ebayPublishedListings,
        },
        availabilityBreakdown,
        categoryDistribution,
        monthlySeries,
        alerts,
        recentActivity: feed.slice(0, 12),
        searchable: {
          parts: parts.slice(0, 250).map((p) => ({
            id: p.id,
            title: p.title,
            oem_code: p.oem_code,
            internal_code: p.internal_code,
            position_note: p.position_note,
            price: Number(p.price || 0),
            quantity: Number(p.quantity || 0),
            status: p.status,
          })),
          vehicles: vehicles.slice(0, 150).map((v) => ({
            id: v.id,
            make: v.make,
            model: v.model,
            year: v.year,
            plate: v.plate,
            vin: v.vin,
            status: v.status,
          })),
          orders: orders.slice(0, 100).map((o) => ({
            id: o.id,
            order_number: o.order_number,
            total: Number(o.seller_amount || o.total || 0),
            fulfillment_status: o.fulfillment_status,
            created_at: o.created_at,
          })),
        },
        adminOverview,
      },
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore lettura dati operativi';
    return { data: null, error: msg };
  }
}
