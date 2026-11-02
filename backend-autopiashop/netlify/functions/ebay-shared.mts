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

export const SUPERADMIN_EMAIL = 'lollogamer2009@gmail.com';

export const EBAY_SANDBOX_AUTH_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize';
export const EBAY_SANDBOX_TOKEN_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
export const EBAY_SANDBOX_IDENTITY_URL = 'https://apiz.sandbox.ebay.com/commerce/identity/v1/user';

/**
 * Scope minimi richiesti per la connessione:
 * - https://api.ebay.com/oauth/api_scope (base identity)
 * - https://api.ebay.com/oauth/api_scope/commerce.identity.readonly (necessario per Commerce Identity API /user)
 */
export const EBAY_SANDBOX_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
].join(' ');

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
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Verifica e recupera le credenziali server obbligatorie.
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

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseServiceRoleKey: supabaseServiceRoleKey!.trim(),
    ebayClientId: ebayClientId!.trim(),
    ebayClientSecret: ebayClientSecret!.trim(),
    ebayRuName: ebayRuName!.trim(),
    encryptionKeyHex: encryptionKeyHex!.trim(),
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
 * Cifra un token o segreto utilizzando AES-256-GCM con IV casuale e Authentication Tag.
 * Restituisce una stringa formattata: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encryptToken(plainText: string, keyHex: string): string {
  if (!plainText) {
    throw new Error('Testo in chiaro vuoto da cifrare');
  }

  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    keyBuffer = Buffer.from(keyHex, 'hex');
  } else {
    keyBuffer = crypto.createHash('sha256').update(keyHex).digest();
  }

  const iv = crypto.randomBytes(12); // Nonce raccomandato a 96 bit per AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decifra un payload cifrato precedentemente con encryptToken().
 * Solleva un errore se il tag di autenticazione non corrisponde (manomissione o chiave errata).
 */
export function decryptToken(encryptedPayload: string, keyHex: string): string {
  if (!encryptedPayload || !encryptedPayload.includes(':')) {
    throw new Error('Formato payload cifrato non valido');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Payload cifrato corrotto o incompleto');
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;

  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    keyBuffer = Buffer.from(keyHex, 'hex');
  } else {
    keyBuffer = crypto.createHash('sha256').update(keyHex).digest();
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Autentica rigorosamente la richiesta verificando il JWT Supabase inviato nel Bearer.
 * Controlla che l'utente esista e che possieda un record approvato in seller_profiles.
 * Non si fida di alcun seller_id o user_id passato dal client.
 */
export async function authenticateApprovedSeller(
  authHeader?: string
): Promise<AuthenticatedSellerContext> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Intestazione Authorization mancante o non in formato Bearer');
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    throw new AuthenticationError('Token JWT vuoto');
  }

  const supabase = getSupabaseAdminClient();

  // 1. Verifica crittografica e validità del JWT tramite Supabase Auth
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    throw new AuthenticationError(
      userError?.message || 'Token utente non valido, scaduto o revocato'
    );
  }

  const user = userData.user;
  const isSuperAdmin = user.email?.trim().toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  // 2. Controllo del profilo autodemolitore associato all'utente autenticato
  const { data: sellerData, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('id, user_id, business_name, status, city')
    .eq('user_id', user.id)
    .maybeSingle();

  if (sellerError) {
    throw new DatabaseError(`Errore verifica profilo autodemolitore: ${sellerError.message}`);
  }

  // Se l'utente è il superadmin master ma non ha ancora un record seller_profiles personale,
  // seleziona il primo venditore attivo o il proprio profilo per consentire le operazioni di test
  if (isSuperAdmin && !sellerData) {
    const { data: firstSeller } = await supabase
      .from('seller_profiles')
      .select('id, user_id, business_name, status, city')
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (firstSeller) {
      return { user, seller: firstSeller as SellerProfileRecord };
    }
  }

  if (!sellerData) {
    throw new ForbiddenError(
      'Nessun profilo autodemolitore associato all\'account utente autenticato'
    );
  }

  if (sellerData.status !== 'approved' && !isSuperAdmin) {
    throw new ForbiddenError(
      `Profilo autodemolitore non autorizzato (stato corrente: ${sellerData.status}). È richiesta l'approvazione da parte di Autopia.`
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
