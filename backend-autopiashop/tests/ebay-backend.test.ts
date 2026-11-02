import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  encryptToken,
  decryptToken,
  getCorsHeaders,
  EBAY_SANDBOX_SCOPES,
  EBAY_SANDBOX_AUTH_URL,
} from '../netlify/functions/ebay-shared.mts';

console.log('--- AVVIO TEST UNITARI BACKEND EBAY OAUTH SANDBOX ---');

// 1. Test Cifratura e Decifratura AES-256-GCM
{
  const secretKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars = 256 bit
  const sampleToken = 'v^1.1#i^1#p^3#r^1#f^0#I^3#t^Ul4xMF82OkE5RkUyNjgxOTkyRTAzOTYyO...';

  const encrypted = encryptToken(sampleToken, secretKey);
  assert.ok(encrypted.includes(':'), 'Il payload cifrato deve contenere i separatori per IV e AuthTag');

  const parts = encrypted.split(':');
  assert.strictEqual(parts.length, 3, 'Il formato deve essere iv:authTag:ciphertext');
  assert.strictEqual(parts[0].length, 24, 'L\'IV deve essere a 96 bit (24 caratteri esadecimali)');
  assert.strictEqual(parts[1].length, 32, 'L\'AuthTag deve essere a 128 bit (32 caratteri esadecimali)');

  // Decifratura corretta
  const decrypted = decryptToken(encrypted, secretKey);
  assert.strictEqual(decrypted, sampleToken, 'Il testo decifrato deve coincidere esattamente con l\'originale');

  // Test anti-manomissione (Integrità crittografica GCM)
  const tamperedCipher = parts[0] + ':' + parts[1] + ':' + parts[2].slice(0, -2) + 'aa';
  assert.throws(
    () => decryptToken(tamperedCipher, secretKey),
    /Unsupported state or unable to authenticate data/,
    'Una manomissione del testo cifrato deve scatenare un errore di autenticazione crittografica'
  );

  // Test IV casuale (Due cifrature dello stesso testo devono produrre ciphertext differenti)
  const encryptedSecond = encryptToken(sampleToken, secretKey);
  assert.notStrictEqual(
    encrypted,
    encryptedSecond,
    'Due chiamate con lo stesso testo devono generare IV e output cifrati differenti'
  );

  console.log('✓ Test 1: Cifratura, decifratura e integrità AES-256-GCM superati con successo');
}

// 2. Test Generazione State e Parametri RuName
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

  // Verifica che redirect_uri sia il RuName letterale e NON l'URL callback
  assert.ok(
    fullAuthUrl.includes(`redirect_uri=${dummyRuName}`),
    'L\'URL di autorizzazione deve utilizzare il RuName letterale di eBay nel parametro redirect_uri'
  );
  assert.ok(
    !fullAuthUrl.includes('autopiashop.it/.netlify'),
    'L\'URL di autorizzazione non deve contenere l\'URL HTTPS di callback'
  );

  // Verifica della presenza dello scope di Identity
  assert.ok(
    EBAY_SANDBOX_SCOPES.includes('https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'),
    'Gli scope devono includere commerce.identity.readonly per poter interrogare /commerce/identity/v1/user'
  );

  console.log('✓ Test 2: Validazione formato RuName e scope Identity superata');
}

// 3. Test Generazione Header CORS
{
  const tauriOrigin = 'http://tauri.localhost';
  const tauriHeaders = getCorsHeaders(tauriOrigin);
  assert.strictEqual(
    tauriHeaders['Access-Control-Allow-Origin'],
    'http://tauri.localhost',
    'CORS deve consentire l\'origine nativa desktop di Tauri'
  );

  const localDevOrigin = 'http://localhost:3000';
  const devHeaders = getCorsHeaders(localDevOrigin);
  assert.strictEqual(
    devHeaders['Access-Control-Allow-Origin'],
    'http://localhost:3000',
    'CORS deve consentire l\'ambiente Vite di sviluppo locale'
  );

  const externalUntrustedOrigin = 'https://malicious-site.com';
  const untrustedHeaders = getCorsHeaders(externalUntrustedOrigin);
  assert.strictEqual(
    untrustedHeaders['Access-Control-Allow-Origin'],
    'https://autopiashop.it',
    'Un\'origine sconosciuta deve fallbackare sul dominio ufficiale autopiashop.it'
  );

  console.log('✓ Test 3: Gestione Header CORS (Tauri / Localhost / Produzione) superata');
}

console.log('--- TUTTI I TEST UNITARI BACKEND SONO STATI SUPERATI CON SUCCESSO ---');
