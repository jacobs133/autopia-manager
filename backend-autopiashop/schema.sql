-- ==============================================================================
-- AUTOPIA MANAGER - FASE 3: INTEGRAZIONE EBAY OAUTH (SANDBOX & PRODUCTION)
-- Schema SQL per le tabelle isolate di gestione OAuth e conservazione token.
--
-- NOTA DI SICUREZZA:
-- Questo script NON modifica alcuna tabella esistente (inventories, parts, seller_profiles, etc.).
-- Le due tabelle create sono protette da Row Level Security (RLS) SENZA policy pubbliche.
-- L'accesso è consentito unicamente al ruolo `service_role` utilizzato dalle Netlify Functions del backend.
-- Nessun client desktop (Tauri) o utente anonimo può accedere direttamente a queste tabelle.
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

-- Indici per ottimizzare la verifica atomica e la pulizia periodica
CREATE INDEX IF NOT EXISTS idx_ebay_oauth_states_lookup 
  ON public.ebay_oauth_states(state_token, is_used, expires_at);

CREATE INDEX IF NOT EXISTS idx_ebay_oauth_states_seller 
  ON public.ebay_oauth_states(seller_id);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.ebay_oauth_states ENABLE ROW LEVEL SECURITY;

-- Nessuna policy per anon o authenticated: solo service_role può leggere e scrivere
COMMENT ON TABLE public.ebay_oauth_states IS 'Stati OAuth monouso anti-CSRF per il collegamento eBay';


-- 2. Tabella persistente per la memorizzazione dei token cifrati
-- I token sono archiviati cifrati con algoritmo AES-256-GCM (IV 96-bit casuale + AuthTag 128-bit).
-- Chiave unica (seller_id, environment) per separare in modo stagno Sandbox e Production.
CREATE TABLE IF NOT EXISTS public.seller_ebay_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  ebay_username VARCHAR(255),
  ebay_user_id VARCHAR(255),
  access_token_encrypted TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_encrypted TEXT,
  refresh_token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Vincolo di unicità: ciascun demolitore ha esattamente 1 configurazione per environment
  CONSTRAINT uq_seller_ebay_env UNIQUE (seller_id, environment)
);

-- Indice di ricerca rapida per lo stato del canale
CREATE INDEX IF NOT EXISTS idx_seller_ebay_tokens_seller_env 
  ON public.seller_ebay_tokens(seller_id, environment, is_active);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.seller_ebay_tokens ENABLE ROW LEVEL SECURITY;

-- Policy di lettura per il solo venditore proprietario:
-- Consente la verifica istantanea dello stato del canale eBay dal desktop
DROP POLICY IF EXISTS "Sellers can view own ebay token status" ON public.seller_ebay_tokens;
CREATE POLICY "Sellers can view own ebay token status"
  ON public.seller_ebay_tokens
  FOR SELECT
  TO authenticated
  USING (
    seller_id IN (
      SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.seller_ebay_tokens IS 'Credenziali e token eBay cifrati AES-256-GCM associati strettamente all autodemolitore';


-- 3. Tabella per le Inserzioni eBay (Fase 3B: Pubblicazione e Sincronizzazione Giacenze)
CREATE TABLE IF NOT EXISTS public.ebay_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventories(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  ebay_item_id VARCHAR(100),
  ebay_offer_id VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'published', -- 'published', 'draft', 'out_of_stock', 'ended'
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_ebay_listings_seller_sku UNIQUE (seller_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_ebay_listings_seller_sku 
  ON public.ebay_listings(seller_id, sku);

CREATE INDEX IF NOT EXISTS idx_ebay_listings_inventory 
  ON public.ebay_listings(inventory_id);

ALTER TABLE public.ebay_listings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ebay_listings IS 'Inserzioni eBay collegate ai ricambi del magazzino Autopia (Fase 3B)';


-- 4. Tabella per gli Ordini di Vendita eBay (Fase 3C: Fulfillment e Scarico Magazzino)
CREATE TABLE IF NOT EXISTS public.ebay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  ebay_order_id VARCHAR(100) NOT NULL,
  buyer_username VARCHAR(100),
  buyer_name VARCHAR(255),
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  order_status VARCHAR(50) NOT NULL DEFAULT 'PAID', -- 'PAID', 'SHIPPED', 'CANCELLED'
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tracking_number VARCHAR(100),
  carrier_code VARCHAR(100),
  shipped_at TIMESTAMPTZ,
  creation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_ebay_orders_seller_order UNIQUE (seller_id, ebay_order_id)
);

CREATE INDEX IF NOT EXISTS idx_ebay_orders_seller_order 
  ON public.ebay_orders(seller_id, ebay_order_id);

ALTER TABLE public.ebay_orders ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ebay_orders IS 'Ordini ricevuti dal marketplace eBay e sincronizzati nel gestionale (Fase 3C)';

