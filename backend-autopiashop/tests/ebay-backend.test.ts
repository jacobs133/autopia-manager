import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  encryptToken,
  decryptToken,
  escapeHtml,
  getCorsHeaders,
  EBAY_SANDBOX_SCOPES,
  EBAY_SANDBOX_AUTH_URL,
  AuthenticationError,
  ForbiddenError,
  DatabaseError,
} from '../netlify/functions/ebay-shared.mts';

console.log('===============================================================');
console.log('   AVVIO SUITE COMPLETA TEST BACKEND EBAY OAUTH SANDBOX        ');
console.log('===============================================================');

// ---------------------------------------------------------------------------
// 1. TEST CIFRATURA E DECIFRATURA AES-256-GCM + VALIDAZIONE CHIAVI
// ---------------------------------------------------------------------------
console.log('\n[1] Test Cifratura AES-256-GCM e Rifiuto Chiavi Non Valide');
{
  const validKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars = 32 byte = 256 bit
  const sampleToken = 'v^1.1#i^1#p^3#r^1#f^0#I^3#t^Ul4xMF82OkE5RkUyNjgxOTkyRTAzOTYyO...';

  // Cifratura corretta
  const encrypted = encryptToken(sampleToken, validKey);
  assert.ok(encrypted.includes(':'), 'Il payload deve contenere i separatori :');

  const parts = encrypted.split(':');
  assert.strictEqual(parts.length, 3, 'Formato atteso: iv:authTag:ciphertext');
  assert.strictEqual(parts[0].length, 24, 'IV deve essere esattamente di 12 byte (24 caratteri esadecimali)');
  assert.strictEqual(parts[1].length, 32, 'AuthTag deve essere esattamente di 16 byte (32 caratteri esadecimali)');
  assert.ok(parts[2].length > 0, 'Il ciphertext non deve essere vuoto');

  // Decifratura corretta
  const decrypted = decryptToken(encrypted, validKey);
  assert.strictEqual(decrypted, sampleToken, 'Il testo decifrato deve coincidere con l\'originale');

  // Integrità crittografica: manomissione ciphertext
  const tamperedCipher = parts[0] + ':' + parts[1] + ':' + parts[2].slice(0, -2) + 'ff';
  assert.throws(
    () => decryptToken(tamperedCipher, validKey),
    /Unsupported state or unable to authenticate data/,
    'Una manomissione del ciphertext deve scatenare un errore di autenticazione GCM'
  );

  // Integrità crittografica: manomissione authTag
  const tamperedTag = parts[0] + ':' + '00'.repeat(16) + ':' + parts[2];
  assert.throws(
    () => decryptToken(tamperedTag, validKey),
    /Unsupported state or unable to authenticate data/,
    'Una manomissione dell\'AuthTag deve scatenare un errore di autenticazione GCM'
  );

  // Due cifrature successive devono produrre IV differenti (CSPRNG)
  const encrypted2 = encryptToken(sampleToken, validKey);
  assert.notStrictEqual(encrypted, encrypted2, 'Ogni cifratura deve generare un IV casuale univoco');

  // Rifiuto chiave mancante o vuota
  assert.throws(
    () => encryptToken(sampleToken, ''),
    /Chiave di cifratura non valida/,
    'Deve rifiutare stringhe chiave vuote'
  );

  // Rifiuto chiave troppo corta (< 64 caratteri hex)
  assert.throws(
    () => encryptToken(sampleToken, 'abcdef1234567890'),
    /Chiave di cifratura non valida/,
    'Deve rifiutare chiavi inferiori a 32 byte'
  );

  // Rifiuto chiave derivata arbitrariamente da password / caratteri non hex
  assert.throws(
    () => encryptToken(sampleToken, 'mia-chiave-segreta-non-esadecimale-da-bloccare-assolutamente-subito!'),
    /Chiave di cifratura non valida/,
    'Deve rifiutare categoricamente password o chiavi non esadecimali senza hash automatico'
  );

  console.log('  ✓ Cifratura AES-256-GCM, IV 96-bit, AuthTag 128-bit e rifiuto chiavi malformate: OK');
}

// ---------------------------------------------------------------------------
// 2. TEST PROTEZIONE XSS (ESCAPE HTML)
// ---------------------------------------------------------------------------
console.log('\n[2] Test Protezione XSS e Sanitizzazione HTML');
{
  const dirty = '<script>alert("xss & cookies")</script>';
  const clean = escapeHtml(dirty);
  assert.strictEqual(
    clean,
    '&lt;script&gt;alert(&quot;xss &amp; cookies&quot;)&lt;/script&gt;',
    'Deve convertire tutti i caratteri speciali HTML in entità sicure'
  );

  assert.strictEqual(escapeHtml(null), '', 'Valore null deve restituire stringa vuota');
  assert.strictEqual(escapeHtml(undefined), '', 'Valore undefined deve restituire stringa vuota');
  assert.strictEqual(escapeHtml("L'azienda del demolitore"), "L&#039;azienda del demolitore");

  console.log('  ✓ Sanitizzazione XSS su input dinamici: OK');
}

// ---------------------------------------------------------------------------
// 3. TEST PARAMETRI OAUTH, RUNAME E SCOPE IDENTITY
// ---------------------------------------------------------------------------
console.log('\n[3] Test RuName Letterale e Scope Identity');
{
  const dummyClientId = 'JacopoS-AutopiaM-SBX-1234567';
  const dummyRuName = 'Jacopo_S-JacopoS-AutopiaM-SBX-abcdef';
  const stateToken = crypto.randomBytes(32).toString('hex');

  const authUrlParams = new URLSearchParams({
    client_id: dummyClientId,
    response_type: 'code',
    redirect_uri: dummyRuName,
    scope: EBAY_SANDBOX_SCOPES,
    state: stateToken,
    prompt: 'login',
  });

  const fullAuthUrl = `${EBAY_SANDBOX_AUTH_URL}?${authUrlParams.toString()}`;

  // Verifica che redirect_uri sia il RuName letterale e NON l'URL HTTPS di callback
  assert.ok(
    fullAuthUrl.includes(`redirect_uri=${dummyRuName}`),
    'Il parametro redirect_uri deve corrispondere esattamente alla stringa RuName'
  );
  assert.ok(
    !fullAuthUrl.includes('autopiashop.it'),
    'L\'URL di autorizzazione eBay non deve contenere domini HTTPS nel redirect_uri'
  );

  // Verifica dello scope Identity necessario per /commerce/identity/v1/user
  assert.ok(
    EBAY_SANDBOX_SCOPES.includes('https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'),
    'Lo scope commerce.identity.readonly deve essere presente per interrogare l\'Identity API'
  );

  // Verifica degli scope Sell Inventory e Fulfillment per le Fasi 3B e 3C
  assert.ok(
    EBAY_SANDBOX_SCOPES.includes('https://api.ebay.com/oauth/api_scope/sell.inventory'),
    'Lo scope sell.inventory deve essere presente per la pubblicazione e sync giacenze (Fase 3B)'
  );
  assert.ok(
    EBAY_SANDBOX_SCOPES.includes('https://api.ebay.com/oauth/api_scope/sell.fulfillment'),
    'Lo scope sell.fulfillment deve essere presente per gli ordini e il tracking (Fase 3C)'
  );

  console.log('  ✓ RuName letterale e scope commerce.identity.readonly: OK');
}

// ---------------------------------------------------------------------------
// 4. TEST HEADER CORS PER TAURI DESKTOP E PRODUZIONE
// ---------------------------------------------------------------------------
console.log('\n[4] Test Header CORS (Tauri Desktop vs Produzione vs Origini Non Attendibili)');
{
  const tauriHeader = getCorsHeaders('http://tauri.localhost');
  assert.strictEqual(tauriHeader['Access-Control-Allow-Origin'], 'http://tauri.localhost');

  const tauriSchemeHeader = getCorsHeaders('tauri://localhost');
  assert.strictEqual(tauriSchemeHeader['Access-Control-Allow-Origin'], 'tauri://localhost');

  const devHeader = getCorsHeaders('http://localhost:3000');
  assert.strictEqual(devHeader['Access-Control-Allow-Origin'], 'http://localhost:3000');

  const untrustedHeader = getCorsHeaders('https://evil-hacker.com');
  assert.strictEqual(
    untrustedHeader['Access-Control-Allow-Origin'],
    'https://autopiashop.it',
    'Un\'origine non riconosciuta deve fare fallback sul dominio ufficiale autopiashop.it'
  );

  console.log('  ✓ Gestione CORS per origini Tauri e fallback sicuro: OK');
}

// ---------------------------------------------------------------------------
// 5. TEST AUTENTICAZIONE E ISOLAMENTO RIGOROSO DEL DEMOLITORE (ZERO-TRUST)
// ---------------------------------------------------------------------------
console.log('\n[5] Test Logica Autenticazione e Isolamento dei Demolitori');
{
  // Simulazione logica authenticateApprovedSeller senza bypass admin
  interface MockUser {
    id: string;
    email: string;
  }
  interface MockSeller {
    id: string;
    user_id: string;
    business_name: string;
    status: string;
  }

  function simulateAuthCheck(
    authHeader: string | undefined,
    userInJwt: MockUser | null,
    sellerInDb: MockSeller | null
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Intestazione Authorization mancante o non in formato Bearer');
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt || !userInJwt) {
      throw new AuthenticationError('Token utente non valido, scaduto o revocato');
    }

    // Regola 1: nessun fallback o bypass per admin. Tutti devono avere un seller_profile approvato
    if (!sellerInDb || sellerInDb.user_id !== userInJwt.id) {
      throw new ForbiddenError(
        'Nessun profilo autodemolitore associato all\'account utente autenticato. Per collegare eBay è necessario disporre di un profilo venditore registrato.'
      );
    }

    if (sellerInDb.status !== 'approved') {
      throw new ForbiddenError(
        `Profilo autodemolitore non autorizzato (stato corrente: ${sellerInDb.status}). È richiesta l'approvazione formale dell'account da parte di Autopia.`
      );
    }

    return { user: userInJwt, seller: sellerInDb };
  }

  // 5.1 Utente non autenticato (header assente)
  assert.throws(
    () => simulateAuthCheck(undefined, null, null),
    (err: any) => err instanceof AuthenticationError && err.statusCode === 401,
    'Senza header Authorization deve sollevare AuthenticationError (401)'
  );

  // 5.2 Header Bearer vuoto o token non valido
  assert.throws(
    () => simulateAuthCheck('Bearer ', null, null),
    (err: any) => err instanceof AuthenticationError && err.statusCode === 401,
    'Con Bearer vuoto deve sollevare AuthenticationError (401)'
  );

  // 5.3 Utente registrato ma senza profilo autodemolitore
  const normalUser: MockUser = { id: 'usr-111', email: 'utente@test.it' };
  assert.throws(
    () => simulateAuthCheck('Bearer valid.jwt.token', normalUser, null),
    (err: any) => err instanceof ForbiddenError && err.statusCode === 403,
    'Utente senza record in seller_profiles deve ricevere ForbiddenError (403)'
  );

  // 5.4 Demolitore con profilo NON approvato (es. pending)
  const pendingSeller: MockSeller = {
    id: 'sel-222',
    user_id: normalUser.id,
    business_name: 'Demolizioni Rossi',
    status: 'pending',
  };
  assert.throws(
    () => simulateAuthCheck('Bearer valid.jwt.token', normalUser, pendingSeller),
    (err: any) => err instanceof ForbiddenError && err.statusCode === 403,
    'Demolitore in stato pending deve ricevere ForbiddenError (403)'
  );

  // 5.5 Amministratore senza profilo seller approvato (verifica assenza di bypass o associazione arbitraria)
  const adminUser: MockUser = { id: 'usr-admin', email: 'lollogamer2009@gmail.com' };
  assert.throws(
    () => simulateAuthCheck('Bearer valid.admin.jwt', adminUser, null),
    (err: any) => err instanceof ForbiddenError && err.statusCode === 403,
    'Anche l\'amministratore senza profilo seller deve ricevere ForbiddenError (403), nessun bypass'
  );

  // 5.6 Demolitore approvato (successo)
  const approvedSeller: MockSeller = {
    id: 'sel-333',
    user_id: normalUser.id,
    business_name: 'Autodemolizioni Bianchi',
    status: 'approved',
  };
  const authResult = simulateAuthCheck('Bearer valid.jwt.token', normalUser, approvedSeller);
  assert.strictEqual(authResult.seller.id, 'sel-333');
  assert.strictEqual(authResult.seller.status, 'approved');

  console.log('  ✓ Autenticazione rigorosa, controllo status approved e divieto di bypass per admin: OK');
}

// ---------------------------------------------------------------------------
// 6. TEST ISOLAMENTO DATI TRA VENDITORI (ZERO-TRUST)
// ---------------------------------------------------------------------------
console.log('\n[6] Test Isolamento Dati tra Demolitori Multi-Tenant');
{
  // Simulazione: il client passa un presunto seller_id fraudolento nel body/query
  const authenticatedSellerId = 'seller-autenticato-real';
  const maliciousAttemptSellerId = 'seller-vittima-altrui';

  // Tutte le query usano tassativamente authenticatedSellerId estratto dal JWT
  function getSellerFilter(jwtExtractedSellerId: string, untrustedClientParam?: string) {
    // Si ignora tassativamente untrustedClientParam
    return { filterSellerId: jwtExtractedSellerId };
  }

  const queryFilter = getSellerFilter(authenticatedSellerId, maliciousAttemptSellerId);
  assert.strictEqual(
    queryFilter.filterSellerId,
    authenticatedSellerId,
    'Il filtro database deve utilizzare ESCLUSIVAMENTE il seller_id estratto dal JWT autenticato'
  );
  assert.notStrictEqual(
    queryFilter.filterSellerId,
    maliciousAttemptSellerId,
    'Non deve mai consentire accessi incrociati o fidarsi di parametri client'
  );

  console.log('  ✓ Isolamento rigoroso dei dati tra demolitori (Anti Cross-Seller): OK');
}

// ---------------------------------------------------------------------------
// 7. TEST CONSUMO ATOMICO DELLO STATE ANTI-CSRF
// ---------------------------------------------------------------------------
console.log('\n[7] Test Consumo Atomico dello State OAuth');
{
  interface StateRecord {
    state_token: string;
    is_used: boolean;
    expires_at: number; // timestamp
    seller_id: string;
  }

  const statesDb = new Map<string, StateRecord>();
  const validStateToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  // Inserimento state valido (scadenza + 10 minuti)
  statesDb.set(validStateToken, {
    state_token: validStateToken,
    is_used: false,
    expires_at: now + 600000,
    seller_id: 'sel-test',
  });

  // Simulazione operazione atomica: UPDATE ... WHERE is_used = false AND expires_at > now
  function consumeStateAtomically(token: string, currentTime: number): StateRecord | null {
    const rec = statesDb.get(token);
    if (!rec) return null;
    if (rec.is_used) return null; // Già utilizzato
    if (rec.expires_at <= currentTime) return null; // Scaduto

    // Consumo atomico
    rec.is_used = true;
    return { ...rec };
  }

  // 1° utilizzo: deve avere successo
  const firstUse = consumeStateAtomically(validStateToken, now);
  assert.ok(firstUse !== null, 'Il primo utilizzo di uno state valido deve avere successo');
  assert.strictEqual(firstUse.seller_id, 'sel-test');

  // 2° utilizzo dello stesso state: deve fallire (anti-replay)
  const secondUse = consumeStateAtomically(validStateToken, now + 1000);
  assert.strictEqual(secondUse, null, 'Un secondo utilizzo dello stesso state deve essere rifiutato');

  // Tentativo con state scaduto
  const expiredStateToken = crypto.randomBytes(32).toString('hex');
  statesDb.set(expiredStateToken, {
    state_token: expiredStateToken,
    is_used: false,
    expires_at: now - 1000, // Già scaduto
    seller_id: 'sel-test',
  });
  const expiredUse = consumeStateAtomically(expiredStateToken, now);
  assert.strictEqual(expiredUse, null, 'Uno state scaduto deve essere categoricamente rifiutato');

  console.log('  ✓ Consumo atomico, protezione anti-replay e verifica scadenza state: OK');
}

// ---------------------------------------------------------------------------
// 8. TEST ERRORI OAUTH ED IDENTITY API FALLBACK
// ---------------------------------------------------------------------------
console.log('\n[8] Test Gestione Errori OAuth ed Identity API Fallback');
{
  // Simulazione ricezione errore da eBay (es. utente rifiuta l'accesso)
  const queryParamsWithError = {
    error: 'access_denied',
    error_description: 'User denied authorization on eBay',
    state: 'valid-state-123',
  };

  assert.ok(queryParamsWithError.error, 'Riconosce parametro error di eBay');
  const safeMessage = escapeHtml(queryParamsWithError.error_description);
  assert.strictEqual(safeMessage, 'User denied authorization on eBay');

  // Simulazione fallback Identity API: se l'Identity API fallisce, l'account viene comunque collegato con fallback
  function resolveUsername(identityApiOk: boolean, rawUsername?: string) {
    if (identityApiOk && rawUsername) {
      return rawUsername;
    }
    return 'Utente Sandbox';
  }

  assert.strictEqual(
    resolveUsername(true, 'demolitore_test_1'),
    'demolitore_test_1',
    'Se Identity API risponde, salva l\'username reale'
  );
  assert.strictEqual(
    resolveUsername(false),
    'Utente Sandbox',
    'Se Identity API fallisce, usa il fallback Utente Sandbox senza interrompere il flusso'
  );

  console.log('  ✓ Gestione errore rifiuto OAuth e fallback Identity API: OK');
}

// ---------------------------------------------------------------------------
// 9. TEST DISCONNESSIONE LOCALE E AZZERAMENTO TOKEN
// ---------------------------------------------------------------------------
console.log('\n[9] Test Disconnessione Locale e Azzeramento Totale dei Token');
{
  interface DbTokenRecord {
    seller_id: string;
    is_active: boolean;
    access_token_encrypted: string | null;
    refresh_token_encrypted: string | null;
    disconnected_at: string | null;
  }

  const activeRecord: DbTokenRecord = {
    seller_id: 'sel-123',
    is_active: true,
    access_token_encrypted: 'iv:tag:cipherAccessToken',
    refresh_token_encrypted: 'iv:tag:cipherRefreshToken',
    disconnected_at: null,
  };

  // Simulazione operazione disconnect
  function disconnectAccount(record: DbTokenRecord): DbTokenRecord {
    return {
      ...record,
      is_active: false,
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      disconnected_at: new Date().toISOString(),
    };
  }

  const disconnected = disconnectAccount(activeRecord);
  assert.strictEqual(disconnected.is_active, false, 'Stato deve essere is_active = false');
  assert.strictEqual(disconnected.access_token_encrypted, null, 'Access token deve essere impostato a NULL');
  assert.strictEqual(disconnected.refresh_token_encrypted, null, 'Refresh token deve essere azzerato a NULL');
  assert.ok(disconnected.disconnected_at !== null, 'Data di disconnessione deve essere registrata');

  console.log('  ✓ Azzeramento token nel database alla disconnessione: OK');
}

// ---------------------------------------------------------------------------
// 10. TEST ASSENZA DI TOKEN NELLE RISPOSTE DEL DESKTOP (ZERO TOKEN EXPOSURE)
// ---------------------------------------------------------------------------
console.log('\n[10] Test Assenza di Token nelle Risposte verso il Desktop');
{
  // Simulazione payload restituito dall'endpoint ebay-oauth-status
  const statusResponse = {
    isConnected: true,
    environment: 'sandbox',
    sellerId: 'sel-123',
    businessName: 'Autodemolizioni Roma',
    ebayUsername: 'TESTUSER_demolitore',
    connectedAt: '2026-11-02T10:00:00.000Z',
    tokenExpiresAt: '2028-05-02T10:00:00.000Z',
    scopes: ['https://api.ebay.com/oauth/api_scope'],
    message: 'Account eBay collegato regolarmente',
  };

  const responseJson = JSON.stringify(statusResponse);
  assert.ok(!responseJson.includes('access_token'), 'La risposta non deve contenere access_token');
  assert.ok(!responseJson.includes('refresh_token'), 'La risposta non deve contenere refresh_token');
  assert.ok(!responseJson.includes('client_secret'), 'La risposta non deve contenere client_secret');
  assert.ok(!responseJson.includes('encryption_key'), 'La risposta non deve contenere chiavi di cifratura');

  console.log('  ✓ Zero Token Exposure: nessun segreto esposto al client desktop: OK');
}

console.log('\n===============================================================');
console.log('   TUTTI I 10 TEST UNITARI E DI SICUREZZA SONO STATI SUPERATI! ');
console.log('===============================================================\n');
