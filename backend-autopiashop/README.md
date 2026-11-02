# Backend Netlify Functions per Integrazione eBay Sandbox (Autopia Manager)

Questo pacchetto contiene l'implementazione completa e blindata del backend server-side per il flusso di autenticazione protetto **OAuth 2.0 (Authorization Code Grant)** con l'ambiente **eBay Sandbox**.

> **IMPORTANTE: SEPARAZIONE DEI REPOSITORY**  
> Questi file sono predisposti in questa cartella autonoma (`/backend-autopiashop`) e **NON fanno parte del bundle dell'applicazione desktop**.  
> Devono essere trasferiti nel repository del sito web `autopiashop.it` (distribuito su Netlify).  
> **Nessun file o funzione del sito di produzione (inclusa `send-email.mts`) viene alterato.**
> **L'applicazione desktop AUTOPIA MANAGER non viene modificata.**

---

## 1. Struttura dei File da Trasferire

Copia i seguenti 5 file nella cartella `netlify/functions/` del repository del sito web `autopiashop.it`:

```text
autopiashop/ (repository sito web collegato a Netlify)
└── netlify/
    └── functions/
        ├── send-email.mts                 (Esistente nel sito - NON MODIFICARE)
        ├── ebay-shared.mts                (Modulo condiviso: cifratura AES-256-GCM, autenticazione e CORS)
        ├── ebay-oauth-init.mts            (Generazione state CSRF monouso e URL autorizzazione eBay)
        ├── ebay-oauth-callback.mts        (Callback OAuth, token exchange HTTP Basic e salvataggio DB)
        ├── ebay-oauth-status.mts          (Endpoint interrogato dal desktop per verificare lo stato)
        └── ebay-oauth-disconnect.mts      (Disconnessione locale e azzeramento token)
```

---

## 2. Principi di Sicurezza e Architettura Implementati

1. **Zero-Trust e Isolamento dei Demolitori (Multi-Tenant)**:
   - Ogni richiesta proveniente dal client desktop richiede l'header `Authorization: Bearer <JWT>`.
   - Il JWT viene convalidato crittograficamente da Supabase Auth (`supabase.auth.getUser(jwt)`).
   - Viene verificato che l'utente possieda un record associato nella tabella `seller_profiles` con `status = 'approved'`.
   - Non ci si fida mai di `seller_id` o `user_id` inviati dal client: l'identità viene desunta unicamente dal JWT convalidato.
   - **Nessun bypass o associazione automatica per gli amministratori**: qualsiasi utente, anche admin, deve possedere un proprio profilo demolitore approvato per connettere eBay.
2. **Cifratura Forte AES-256-GCM a Riposo**:
   - I token eBay (access token e refresh token) non vengono mai salvati in chiaro nel database.
   - Algoritmo: `AES-256-GCM` con chiave a 256-bit (esattamente 32 byte / 64 caratteri esadecimali).
   - IV (Nonce): 12 byte (96 bit) casuali generati con CSPRNG per ogni singola operazione di cifratura.
   - Authentication Tag: 16 byte (128 bit) per garantire l'integrità e l'autenticità dei dati cifrati contro qualsiasi manomissione.
   - Vengono rifiutate categoricamente chiavi non valide, senza alcuna derivazione automatica da password.
3. **Parametro State Anti-CSRF Monouso**:
   - Generato casualmente con 32 byte di entropia (64 caratteri hex).
   - Validità limitata a 10 minuti.
   - Associato atomicamente a `seller_id` e consumato con operazione atomica (`is_used = false AND expires_at > now()`). Non riutilizzabile.
4. **Regola Tassativa del RuName di eBay**:
   - Nelle richieste OAuth (sia nell'URL di autorizzazione `/authorize` sia nel POST token exchange `/token`), il parametro `redirect_uri` contiene la **stringa letterale del RuName** registrata su eBay (e NON l'URL HTTPS del callback).
5. **Protezione da XSS e Zero Token Exposure**:
   - Tutti i parametri dinamici nella pagina HTML di callback vengono sanificati tramite `escapeHtml()`.
   - Nessun token o segreto viene mai restituito al client desktop o esposto nei log.
6. **Disconnessione Locale Trasparente**:
   - La disconnessione azzera a `NULL` i token nel database e imposta `is_active = false`.
   - Il messaggio specifica chiaramente all'utente che si tratta di una disconnessione locale dell'applicazione e che la revoca remota dell'autorizzazione applicativa può essere gestita nella sezione *Accesso di terze parti* del proprio account eBay.

---

## 3. Configurazione Database Supabase (Esecuzione Manuale)

Prima di effettuare i test, accedi alla console di **Lovable Cloud** o **Supabase** del progetto `ilcpmmgjkzrjyklqdpfl` ed esegui nel **SQL Editor** il file:

```text
backend-autopiashop/schema.sql
```

Lo script crea due tabelle dedicate, completamente isolate e protette:
1. `public.ebay_oauth_states`: memorizza gli state CSRF generati (durata 10 minuti, monouso).
2. `public.seller_ebay_tokens`: archivia le credenziali eBay cifrate associate all'autodemolitore.

**Sicurezza RLS:** Entrambe le tabelle hanno la Row Level Security (RLS) attiva SENZA alcuna policy pubblica. Né il client desktop, né gli utenti anonimi o autenticati possono accedervi via REST API; solo il backend Netlify (usando la Service Role Key privata) ha accesso.

---

## 4. Variabili d'Ambiente su Netlify

Accedi al pannello Netlify di `autopiashop.it` (*Site configuration -> Environment variables*) e configura le seguenti 6 variabili d'ambiente:

| Nome Variabile | Descrizione | Origine del Valore |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL del progetto Supabase | `https://ilcpmmgjkzrjyklqdpfl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave privata `service_role` di Supabase | Console Supabase -> Project Settings -> API -> `service_role` (segreta) |
| `EBAY_SANDBOX_CLIENT_ID` | App ID del Keyset Sandbox | Portale eBay Developer -> Application Keys -> Sandbox App ID |
| `EBAY_SANDBOX_CLIENT_SECRET` | Cert ID del Keyset Sandbox | Portale eBay Developer -> Application Keys -> Sandbox Cert ID |
| `EBAY_SANDBOX_RUNAME` | Nome letterale del RuName Sandbox | Portale eBay Developer -> Application Keys -> RuName string |
| `EBAY_TOKEN_ENCRYPTION_KEY` | Chiave a 256-bit per AES-GCM (32 byte esadecimali = 64 caratteri) | Generata casualmente (vedi comando sotto) |

### Come generare la chiave di cifratura AES-256:
Esegui nel terminale:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copia la stringa esadecimale di 64 caratteri risultante e incollala come valore di `EBAY_TOKEN_ENCRYPTION_KEY` su Netlify.

---

## 5. Configurazione dell'RuName nel Portale Sviluppatori eBay

Accedi a [developer.ebay.com](https://developer.ebay.com/):

1. Vai in **Application Keys** e seleziona **Sandbox**.
2. Clicca su **User Tokens** (oppure su *Sign in with eBay* accanto alla chiave Sandbox).
3. Individua l'**RuName** configurato (es. `NomeAzienda-NomeApp-SBX-1234567-abcdef`).
4. Configura i seguenti campi URL:
   * **Your auth accepted URL:**  
     `https://autopiashop.it/.netlify/functions/ebay-oauth-callback`
   * **Your auth declined URL:**  
     `https://autopiashop.it/.netlify/functions/ebay-oauth-callback?error=access_denied`
5. Salva le impostazioni.

---

## 6. Esecuzione dei Test Unitari

Per verificare l'integrità crittografica e la sicurezza della logica backend:
```bash
npx tsx backend-autopiashop/tests/ebay-backend.test.ts
```
La suite esegue 10 gruppi di test:
- Cifratura AES-256-GCM, IV a 12 byte, AuthTag a 16 byte, anti-manomissione.
- Rifiuto categorico di chiavi non esadecimali o di lunghezza errata (nessun hash automatico).
- Protezione da XSS e sanitizzazione HTML dei messaggi di errore.
- RuName letterale e scope `commerce.identity.readonly`.
- Header CORS per origini desktop Tauri (`http://tauri.localhost`, `tauri://localhost`).
- Autenticazione Bearer JWT e controllo status `approved` del demolitore.
- Divieto assoluto di bypass per amministratori o assegnazioni arbitrarie ad altri venditori.
- Isolamento multi-tenant dei dati e filtri DB non influenzabili dal client.
- Consumo atomico e verifica scadenza/monouso dello state CSRF.
- Gestione errori OAuth, cancellazione utente e fallback Identity API.
- Disconnessione locale con azzeramento totale a `NULL` dei token.
- Zero Token Exposure nelle risposte JSON ed HTML.
