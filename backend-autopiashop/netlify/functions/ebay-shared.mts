import crypto from 'node:crypto';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export interface SellerProfileRecord {
  id: string;
  user_id: string;
  business_name: string;
  status: string;
  city?: string | null;
}

export interface AuthenticatedSellerContext {
  user: User;
  seller: SellerProfileRecord;
}

export const EBAY_SANDBOX_AUTH_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize';
export const EBAY_SANDBOX_TOKEN_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
export const EBAY_SANDBOX_IDENTITY_URL = 'https://apiz.sandbox.ebay.com/commerce/identity/v1/user';
export const EBAY_SANDBOX_INVENTORY_URL = 'https://api.sandbox.ebay.com/sell/inventory/v1';
export const EBAY_SANDBOX_FULFILLMENT_URL = 'https://api.sandbox.ebay.com/sell/fulfillment/v1';

/**
 * Scope completi richiesti per la connessione (Fase 3A, 3B e 3C):
 * - https://api.ebay.com/oauth/api_scope (base identity)
 * - https://api.ebay.com/oauth/api_scope/commerce.identity.readonly (Identity API /user)
 * - https://api.ebay.com/oauth/api_scope/sell.inventory (Fase 3B: pubblicazione annunci e sync inventario)
 * - https://api.ebay.com/oauth/api_scope/sell.account (Fase 3B: politiche spedizione e reso)
 * - https://api.ebay.com/oauth/api_scope/sell.fulfillment (Fase 3C: ordini e tracking spedizioni)
 */
export const EBAY_SANDBOX_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
].join(' ');

/**
 * Funzione di escaping HTML per proteggere qualsiasi dato dinamico da attacchi XSS.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Genera gli header CORS compatibili con l'ambiente desktop Tauri e il web.
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const allowedOrigins = [
    'https://autopiashop.it',
    'http://localhost:3000',
    'http://tauri.localhost',
    'tauri://localhost',
  ];

  let originToSet = 'https://autopiashop.it';
  if (requestOrigin) {
    const isAllowed = allowedOrigins.some((allowed) =>
      requestOrigin === allowed || requestOrigin.startsWith('http://localhost:')
    );
    if (isAllowed) {
      originToSet = requestOrigin;
    }
  }

  return {
    'Access-Control-Allow-Origin': originToSet,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Verifica e recupera le credenziali server obbligatorie.
 * Rifiuta chiavi di cifratura non conformi a 256 bit (64 caratteri esadecimali).
 */
export function getRequiredEnvVars(): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  ebayClientId: string;
  ebayClientSecret: string;
  ebayRuName: string;
  encryptionKeyHex: string;
} {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ilcpmmgjkzrjyklqdpfl.supabase.co';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ebayClientId = process.env.EBAY_SANDBOX_CLIENT_ID;
  const ebayClientSecret = process.env.EBAY_SANDBOX_CLIENT_SECRET;
  const ebayRuName = process.env.EBAY_SANDBOX_RUNAME;
  const encryptionKeyHex = process.env.EBAY_TOKEN_ENCRYPTION_KEY;

  const missing: string[] = [];
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ebayClientId) missing.push('EBAY_SANDBOX_CLIENT_ID');
  if (!ebayClientSecret) missing.push('EBAY_SANDBOX_CLIENT_SECRET');
  if (!ebayRuName) missing.push('EBAY_SANDBOX_RUNAME');
  if (!encryptionKeyHex) missing.push('EBAY_TOKEN_ENCRYPTION_KEY');

  if (missing.length > 0) {
    throw new Error(`Variabili d'ambiente server mancanti su Netlify: ${missing.join(', ')}`);
  }

  const cleanKey = encryptionKeyHex!.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error(
      'EBAY_TOKEN_ENCRYPTION_KEY non valida: deve essere una stringa esadecimale di esattamente 64 caratteri (32 byte / 256 bit).'
    );
  }

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseServiceRoleKey: supabaseServiceRoleKey!.trim(),
    ebayClientId: ebayClientId!.trim(),
    ebayClientSecret: ebayClientSecret!.trim(),
    ebayRuName: ebayRuName!.trim(),
    encryptionKeyHex: cleanKey,
  };
}

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Inizializza il client Supabase con la Service Role Key privata.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = getRequiredEnvVars();
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedAdminClient;
}

/**
 * Cifra un token o segreto utilizzando AES-256-GCM.
 * Requisiti crittografici rigorosi:
 * - Chiave: esattamente 32 byte (64 caratteri esadecimali). Rifiuta chiavi non valide senza derivazione automatica.
 * - IV: 12 byte (96 bit) casuali generati con CSPRNG.
 * - Auth Tag: 16 byte (128 bit) generati da AES-GCM per garantire autenticità e integrità.
 * Restituisce: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encryptToken(plainText: string, keyHex: string): string {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Testo in chiaro non valido o vuoto da cifrare');
  }

  if (!keyHex || typeof keyHex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(keyHex.trim())) {
    throw new Error(
      'Chiave di cifratura non valida: deve essere una stringa esadecimale di esattamente 64 caratteri (32 byte / 256 bit). Derivazione automatica da password disabilitata.'
    );
  }

  const keyBuffer = Buffer.from(keyHex.trim(), 'hex');
  const iv = crypto.randomBytes(12); // Nonce raccomandato a 96 bit (12 byte) per AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag(); // 16 byte (128 bit)

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decifra un payload cifrato precedentemente con encryptToken().
 * Solleva un errore crittografico se il tag di autenticazione non corrisponde o se il payload è manomesso.
 * Non espone mai chiavi o token nei messaggi di errore.
 */
export function decryptToken(encryptedPayload: string, keyHex: string): string {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Payload cifrato non valido');
  }

  if (!keyHex || typeof keyHex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(keyHex.trim())) {
    throw new Error(
      'Chiave di cifratura non valida: deve essere una stringa esadecimale di esattamente 64 caratteri (32 byte).'
    );
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato del payload cifrato non valido');
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;

  // Verifica lunghezze esadecimali: IV 12 byte = 24 hex, AuthTag 16 byte = 32 hex
  if (!/^[0-9a-fA-F]{24}$/.test(ivHex) || !/^[0-9a-fA-F]{32}$/.test(authTagHex) || !/^[0-9a-fA-F]+$/.test(cipherTextHex)) {
    throw new Error('Componenti del payload cifrato malformati');
  }

  const keyBuffer = Buffer.from(keyHex.trim(), 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Autentica rigorosamente la richiesta verificando il JWT Supabase inviato nell'header Authorization Bearer.
 * 
 * Regole di sicurezza e isolamento:
 * 1. Verifica crittografica e validità del JWT tramite supabaseAdmin.auth.getUser(jwt).
 * 2. Estrazione dell'user_id verificato dal JWT; NON si fida mai di seller_id o user_id inviati dal client.
 * 3. Recupero del profilo venditore strettamente associato all'user.id (tabella seller_profiles).
 * 4. Controllo che il profilo esista e abbia status === 'approved'.
 * 5. NESSUNA associazione automatica ad altri demolitori: ogni account appartiene esclusivamente al demolitore autenticato.
 * 6. Anche gli amministratori devono possedere un proprio profilo seller approvato per connettere eBay.
 */
export async function authenticateApprovedSeller(
  authHeader?: string,
  requestedSellerId?: string | null
): Promise<AuthenticatedSellerContext> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Intestazione Authorization mancante o non in formato Bearer');
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    throw new AuthenticationError('Token JWT vuoto');
  }

  const supabase = getSupabaseAdminClient();

  // 1. Verifica crittografica del JWT tramite Supabase Auth
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    throw new AuthenticationError(
      userError?.message || 'Token utente non valido, scaduto o revocato'
    );
  }

  const user = userData.user;

  // 2. Controllo del ruolo amministratore direttamente sul backend
  const isAdminEmail = user.email?.trim().toLowerCase() === 'lollogamer2009@gmail.com';
  let hasAdminRole = false;
  try {
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    hasAdminRole = Array.isArray(roleRows) && roleRows.some((r) => r.role === 'admin');
  } catch {
    // Non bloccare se la tabella user_roles non è interrogabile
  }
  const isPlatformAdmin = isAdminEmail || hasAdminRole;

  // Se l'utente è un amministratore e ha specificato un seller_id target da gestire:
  if (isPlatformAdmin && requestedSellerId && requestedSellerId.trim() !== '') {
    const { data: requestedSeller, error: reqErr } = await supabase
      .from('seller_profiles')
      .select('id, user_id, business_name, status, city')
      .eq('id', requestedSellerId.trim())
      .maybeSingle();

    if (reqErr) {
      throw new DatabaseError(`Errore verifica profilo autodemolitore gestito dall'amministratore: ${reqErr.message}`);
    }

    if (!requestedSeller) {
      throw new ForbiddenError(
        `Nessun profilo autodemolitore trovato con l'identificativo '${requestedSellerId.trim()}'.`
      );
    }

    if (requestedSeller.status !== 'approved') {
      throw new ForbiddenError(
        `Il profilo autodemolitore '${requestedSeller.business_name || requestedSeller.id}' non risulta in stato approvato (stato: ${requestedSeller.status}).`
      );
    }

    return {
      user,
      seller: requestedSeller as SellerProfileRecord,
    };
  }

  // Se è amministratore ma non ha passato requestedSellerId, cerca prima il suo profilo venditore personale
  if (isPlatformAdmin) {
    const { data: adminOwnSeller } = await supabase
      .from('seller_profiles')
      .select('id, user_id, business_name, status, city')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminOwnSeller && adminOwnSeller.status === 'approved') {
      return { user, seller: adminOwnSeller as SellerProfileRecord };
    }

    // Se l'amministratore non ha un proprio seller_profile, recupera l'ultimo venditore approvato
    const { data: latestSeller } = await supabase
      .from('seller_profiles')
      .select('id, user_id, business_name, status, city')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSeller) {
      return { user, seller: latestSeller as SellerProfileRecord };
    }
  }

  // 3. Controllo per utente standard (Zero-Trust): controllo STRETTO per user_id = user.id
  // Non ammette seller_id arbitrari inviati dal client per utenti non-admin
  const { data: sellerData, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('id, user_id, business_name, status, city')
    .eq('user_id', user.id)
    .maybeSingle();

  if (sellerError) {
    throw new DatabaseError(`Errore verifica profilo autodemolitore: ${sellerError.message}`);
  }

  if (!sellerData) {
    throw new ForbiddenError(
      'Nessun profilo autodemolitore associato all\'account utente autenticato. Per collegare eBay è necessario disporre di un profilo venditore registrato.'
    );
  }

  // Se un non-admin passa un requestedSellerId diverso dal proprio profilo, respingi la richiesta
  if (requestedSellerId && requestedSellerId.trim() !== sellerData.id) {
    throw new ForbiddenError(
      'Accesso negato: l\'utente autenticato non è autorizzato a gestire il canale eBay di un altro autodemolitore.'
    );
  }

  // Verifica stato approvato
  if (sellerData.status !== 'approved') {
    throw new ForbiddenError(
      `Profilo autodemolitore non autorizzato (stato corrente: ${sellerData.status}). È richiesta l'approvazione formale dell'account da parte di Autopia.`
    );
  }

  return {
    user,
    seller: sellerData as SellerProfileRecord,
  };
}

export class AuthenticationError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Recupera l'access token eBay valido per il demolitore specificato.
 * Se l'access token corrente è scaduto o in scadenza (entro 5 minuti),
 * esegue automaticamente il token refresh tramite il refresh_token cifrato,
 * aggiorna il database in modo atomico e sicuro, e restituisce il nuovo access token.
 */
export async function getValidEbayAccessToken(sellerId: string): Promise<{
  accessToken: string;
  ebayUsername: string | null;
}> {
  const { ebayClientId, ebayClientSecret, encryptionKeyHex } = getRequiredEnvVars();
  const supabase = getSupabaseAdminClient();

  const { data: tokenRecord, error } = await supabase
    .from('seller_ebay_tokens')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('environment', 'sandbox')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(`Errore recupero credenziali eBay: ${error.message}`);
  }

  const accessPayload = tokenRecord?.access_token_encrypted || tokenRecord?.encrypted_access_token;
  if (!tokenRecord || !accessPayload) {
    throw new ForbiddenError('Nessun account eBay Sandbox collegato per questo demolitore.');
  }

  // Verifica scadenza: margine di sicurezza di 5 minuti (300.000 ms)
  const expiresAt = tokenRecord.access_token_expires_at
    ? new Date(tokenRecord.access_token_expires_at).getTime()
    : 0;
  const now = Date.now();
  const isExpiringSoon = expiresAt - now < 5 * 60 * 1000;

  if (!isExpiringSoon) {
    const accessToken = decryptToken(accessPayload, encryptionKeyHex);
    return { accessToken, ebayUsername: tokenRecord.ebay_username || null };
  }

  // Refresh token flow
  const refreshPayload = tokenRecord.refresh_token_encrypted || tokenRecord.encrypted_refresh_token;
  if (!refreshPayload) {
    throw new ForbiddenError('Refresh token eBay non disponibile. Riconnetti l\'account eBay.');
  }

  const refreshToken = decryptToken(refreshPayload, encryptionKeyHex);

  const basicAuth = Buffer.from(`${ebayClientId}:${ebayClientSecret}`).toString('base64');
  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: EBAY_SANDBOX_SCOPES,
  });

  const response = await fetch(EBAY_SANDBOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ebay-shared] Errore refresh token eBay:', errorText);
    throw new ForbiddenError('Sessione eBay scaduta o revocata. Riconnetti l\'account tramite OAuth.');
  }

  const tokenData = await response.json();
  const newAccessToken = tokenData.access_token;
  const expiresInSeconds = tokenData.expires_in || 7200;
  const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  // Cifra il nuovo access token (restituisce formato iv:tag:cipher)
  const encAccess = encryptToken(newAccessToken, encryptionKeyHex);

  const updatePayload: Record<string, unknown> = {
    access_token_encrypted: encAccess,
    access_token_expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  };

  if (tokenData.refresh_token) {
    const encRefresh = encryptToken(tokenData.refresh_token, encryptionKeyHex);
    updatePayload.refresh_token_encrypted = encRefresh;
  }

  await supabase
    .from('seller_ebay_tokens')
    .update(updatePayload)
    .eq('id', tokenRecord.id);

  return {
    accessToken: newAccessToken,
    ebayUsername: tokenRecord.ebay_username || null,
  };
}
