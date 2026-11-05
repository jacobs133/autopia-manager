export type EbayEnvironment = 'sandbox' | 'production';

export type EbayBackendStatus =
  | 'idle'
  | 'checking'
  | 'connected'
  | 'not_connected'
  | 'backend_not_configured'
  | 'error';

export interface EbayConnectionInfo {
  isConnected: boolean;
  environment: EbayEnvironment;
  ebayUsername: string | null;
  connectedAt: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  lastCheckedAt: string;
  status: EbayBackendStatus;
  message?: string;
  rawDetails?: Record<string, unknown>;
}

export interface EbayOAuthInitResult {
  success: boolean;
  authorizationUrl?: string;
  state?: string;
  error?: string;
  isBackendMissing?: boolean;
}

export interface EbayListingItem {
  id: string;
  seller_id: string;
  inventory_id: string | null;
  sku: string;
  ebay_item_id: string | null;
  ebay_offer_id: string | null;
  title: string;
  price: number;
  quantity: number;
  status: 'published' | 'draft' | 'out_of_stock' | 'ended';
  last_synced_at: string;
  created_at: string;
}

export interface EbayOrderLineItem {
  lineItemId: string;
  sku: string;
  title: string;
  quantity: number;
  lineItemCost: string;
}

export interface EbayOrder {
  id: string;
  seller_id: string;
  ebay_order_id: string;
  buyer_username: string;
  buyer_name: string;
  shipping_address: {
    fullName?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
  total_price: number;
  currency: string;
  order_status: 'PAID' | 'SHIPPED' | 'CANCELLED';
  line_items: EbayOrderLineItem[];
  tracking_number?: string | null;
  carrier_code?: string | null;
  shipped_at?: string | null;
  creation_date: string;
  synced_at: string;
}

export interface EbayDiagnosticCheck {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  details?: unknown;
}

export interface EbayDiagnosticsReport {
  timestamp: string;
  checks: EbayDiagnosticCheck[];
  allPassed: boolean;
}

