-- ==============================================================================
-- AUTOPIA MANAGER - FASE 3: INTEGRAZIONE EBAY OAUTH (SANDBOX & PRODUCTION)
-- Schema SQL per le tabelle isolate di gestione OAuth e conservazione token.
--
-- NOTA DI SICUREZZA:
-- Questo script NON modifica alcuna tabella esistente (inventories, parts, seller_profiles, etc.).
-- Le due tabelle create sono protette da Row Level Security (RLS) SENZA policy pubbliche.
-- L'accesso è consentito unicamente al ruolo `service_role` utilizzato dalle Netlify Functions.
-- ==============================================================================

-- 1. Tabella temporanea per la validazione dello state anti-CSRF
-- Durata di vita massima dello state: 10 minuti. Monouso.
CREATE TABLE IF NOT EXISTS public.ebay_oauth_states (
  state_token VARCHAR(64) PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at TIMESTAMPTZ
);

-- Indici per ottimizzare la verifica e la pulizia automatica
CREATE INDEX IF NOT EXISTS idx_ebay_oauth_states_lookup 
  ON public.ebay_oauth_states(state_token, is_used, expires_at);

CREATE INDEX IF NOT EXISTS idx_ebay_oauth_states_seller 
  ON public.ebay_oauth_states(seller_id);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.ebay_oauth_states ENABLE ROW LEVEL SECURITY;

-- Nessuna policy per anon o authenticated: solo service_role può leggere/scrivere
COMMENT ON TABLE public.ebay_oauth_states IS 'Stati OAuth monouso anti-CSRF per il collegamento eBay';


-- 2. Tabella persistente per la memorizzazione dei token cifrati
-- I token sono archiviati cifrati con algoritmo AES-256-GCM.
-- Chiave unica (seller_id, environment) per separare in modo stagno Sandbox e Production.
CREATE TABLE IF NOT EXISTS public.seller_ebay_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  ebay_username VARCHAR(255),
  ebay_user_id VARCHAR(255),
  access_token_encrypted TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_encrypted TEXT NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Vincolo di unicità: un venditore ha al massimo 1 configurazione Sandbox e 1 Production
  CONSTRAINT uq_seller_ebay_env UNIQUE (seller_id, environment)
);

-- Indici di ricerca
CREATE INDEX IF NOT EXISTS idx_seller_ebay_tokens_seller_env 
  ON public.seller_ebay_tokens(seller_id, environment, is_active);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.seller_ebay_tokens ENABLE ROW LEVEL SECURITY;

-- Nessuna policy per anon o authenticated:
-- Né il client desktop, né altri venditori possono eseguire SELECT o accedere ai token.
-- Solo il backend Netlify (usando SUPABASE_SERVICE_ROLE_KEY) ha accesso.
COMMENT ON TABLE public.seller_ebay_tokens IS 'Credenziali e token eBay cifrati AES-256-GCM associati all autodemolitore';
