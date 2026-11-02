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
