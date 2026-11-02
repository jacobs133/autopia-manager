# Backend Netlify Functions per Integrazione eBay Sandbox (Autopia Manager)

Questo pacchetto contiene l'implementazione completa del backend server-side per il flusso di autenticazione protetto **OAuth 2.0 (Authorization Code Grant)** con l'ambiente **eBay Sandbox**.

> **IMPORTANTE: SEPARAZIONE DEI REPOSITORY**  
> Questi file sono predisposti in questa cartella autonoma (`/backend-autopiashop`) e **NON fanno parte del bundle dell'applicazione desktop**.  
> Devono essere trasferiti nel repository del sito web `autopiashop.it` (distribuito su Netlify).  
> **Nessun file o funzione del sito di produzione (inclusa `send-email.mts`) viene alterato.**

---

## 1. Struttura dei File da Trasferire

Copia i seguenti file nella cartella `netlify/functions/` del repository del sito `autopiashop.it`:

```text
autopiashop/ (repository sito web)
└── netlify/
    └── functions/
        ├── send-email.mts                 (Esistente - NON MODIFICARE)
        ├── ebay-shared.mts                (Nuovo: utilità crittografiche AES-256-GCM e auth)
        ├── ebay-oauth-init.mts            (Nuovo: generazione state anti-CSRF e URL auth)
        ├── ebay-oauth-callback.mts        (Nuovo: callback RuName, token exchange e Identity API)
        ├── ebay-oauth-status.mts          (Nuovo: endpoint interrogato dal desktop per lo stato)
        └── ebay-oauth-disconnect.mts      (Nuovo: disconnessione locale e azzeramento token)
```

---

## 2. Configurazione Database Supabase (Esecuzione Manuale)

Prima di effettuare i test, accedi alla console di **Lovable Cloud** o **Supabase** del progetto `ilcpmmgjkzrjyklqdpfl` ed esegui nel **SQL Editor** il file:

```text
backend-autopiashop/schema.sql
```

Questo script crea due tabelle dedicate, completamente isolate e protette:
1. `public.ebay_oauth_states`: memorizza gli state CSRF generati (durata 10 minuti, monouso).
2. `public.seller_ebay_tokens`: archivia i refresh token cifrati associati all'autodemolitore.

**Sicurezza RLS:** Entrambe le tabelle hanno la Row Level Security (RLS) attiva senza alcuna policy pubblica. Nessun client desktop o utente anonimo può leggerle; solo il backend Netlify (usando la Service Role Key) ha accesso.

---

## 3. Variabili d'Ambiente su Netlify

Accedi al pannello Netlify di `autopiashop.it` (*Site configuration -> Environment variables*) e configura le seguenti 6 variabili d'ambiente:

| Nome Variabile | Descrizione | Origine del Valore |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL del progetto Supabase | `https://ilcpmmgjkzrjyklqdpfl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave privata `service_role` di Supabase | Console Supabase -> Project Settings -> API -> `service_role` (segreta) |
| `EBAY_SANDBOX_CLIENT_ID` | App ID del Keyset Sandbox | Portale eBay Developer -> Application Keys -> Sandbox App ID |
| `EBAY_SANDBOX_CLIENT_SECRET` | Cert ID del Keyset Sandbox | Portale eBay Developer -> Application Keys -> Sandbox Cert ID |
| `EBAY_SANDBOX_RUNAME` | Nome letterale del RuName Sandbox | Portale eBay Developer -> Application Keys -> RuName string |
| `EBAY_TOKEN_ENCRYPTION_KEY` | Chiave a 256-bit per AES-GCM | Generata casualmente: stringa esadecimale da 64 caratteri (vedi sotto) |

### Come generare la chiave di cifratura AES-256:
Puoi generare una chiave esadecimale sicura eseguendo nel terminale:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Configurazione dell'RuName nel Portale Sviluppatori eBay

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

> **REGOLA ARCHITETTURALE TASSATIVA:**  
> Nelle richieste verso l'endpoint di autorizzazione e di token exchange di eBay, il parametro `redirect_uri` deve contenere **la stringa letterale del RuName**, e NON l'URL di callback. Il codice fornito gestisce già questa regola in modo rigoroso.

---

## 5. Scope e Identità eBay

Il backend richiede e gestisce i seguenti due scope ufficiali:
1. `https://api.ebay.com/oauth/api_scope` (scope di base per l'emissione del token utente).
2. `https://api.ebay.com/oauth/api_scope/commerce.identity.readonly` (scope necessario per invocare la **Commerce Identity API** `https://apiz.sandbox.ebay.com/commerce/identity/v1/user` e recuperare l'username reale del venditore di test).

---

## 6. Procedura di Test Sandbox Completo

1. **Deploy:** Esegui il commit e il push dei 5 file su GitHub nel repository del sito e attendi il deploy automatico di Netlify.
2. **Account Test eBay:** Nel Developer Portal, sotto *Sandbox User Accounts*, crea o prendi nota delle credenziali di un utente fittizio (es. `TESTUSER_demolitore`).
3. **Avvio dal Desktop:** Apri **Autopia Manager Desktop**, accedi con il profilo demolitore approvato e vai nella sezione **Canale eBay**.
4. **Stato Iniziale:** La schermata mostra `NON COLLEGATO`. Clicca su **"Collega account eBay (Sandbox)"**.
5. **Consenso:** Si aprirà il browser sulla pagina di accesso eBay Sandbox. Inserisci le credenziali dell'utente di test Sandbox e clicca su *I Agree* (Acconsento).
6. **Callback:** eBay reindirizza a `https://autopiashop.it/.netlify/functions/ebay-oauth-callback`. La pagina web mostrerà l'esito: *"Account eBay Sandbox Collegato!"*.
7. **Rilevamento Desktop:** Tornando su Autopia Manager Desktop, clicca su **"Aggiorna Stato"** (o attendi la sincronizzazione): lo stato diventerà **COLLEGATO (SANDBOX)**, mostrando il nome utente eBay e la data di scadenza.
8. **Disconnessione:** Cliccando su **"Scollega Account eBay"**, i token vengono cancellati in sicurezza dal database e il gestionale torna allo stato `NON COLLEGATO`.
