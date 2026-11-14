import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Store,
  Info,
  Building2,
  Unplug,
  Clock,
  Sparkles,
  Package,
  ShoppingBag,
  Truck,
  Plus,
  Send,
  Check,
  Wrench,
  Copy,
  X,
} from 'lucide-react';
import { openExternalUrl, copyToClipboard as copyExternalUrl } from '../../services/externalLinkService';
import { useAuth } from '../../contexts/AuthContext';
import type {
  EbayConnectionInfo,
  EbayListingItem,
  EbayOrder,
  EbayDiagnosticsReport,
} from '../../types/ebay';
import {
  fetchEbayConnectionStatus,
  initiateEbayOAuth,
  disconnectEbayAccount,
  getEbayOAuthBackendBaseUrl,
  fetchEbayListings,
  publishPartToEbay,
  syncEbayInventoryQuantity,
  fetchLocalEbayOrders,
  syncOrdersFromEbay,
  fulfillEbayOrder,
  runEbayIntegrationDiagnostics,
} from '../../services/ebayService';
import { fetchSellerInventory } from '../../services/partsService';
import type { InventoryItem } from '../../types/inventory';
import {
  uiClasses,
  Button,
  StatusBadge,
  AlertBanner,
  EmptyState,
} from '../ui/DesignSystem';

type EbayTab = 'oauth' | 'listings' | 'orders';

export const EbayManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile, isAdmin } = useAuth();
  const activeSeller = effectiveSellerProfile || sellerProfile;

  const [activeTab, setActiveTab] = useState<EbayTab>('oauth');

  // Stato Connessione OAuth
  const [connectionInfo, setConnectionInfo] = useState<EbayConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showArchitectureDetails, setShowArchitectureDetails] = useState<boolean>(false);

  // Stato Diagnostica Canale eBay (esclusivo Admin)
  const [diagnosticsReport, setDiagnosticsReport] = useState<EbayDiagnosticsReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [pendingAuthUrl, setPendingAuthUrl] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
    if (!isAdmin) return;
    setIsDiagnosing(true);
    setShowDiagnosticsModal(true);
    try {
      const report = await runEbayIntegrationDiagnostics();
      setDiagnosticsReport(report);
    } catch (e: unknown) {
      console.error('Errore esecuzione diagnostica:', e);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 3000);
    }
  };

  // Stato Inserzioni eBay
  const [listings, setListings] = useState<EbayListingItem[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState<boolean>(false);
  const [warehouseItems, setWarehouseItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [publishForm, setPublishForm] = useState<{
    price: string;
    quantity: string;
    sku: string;
    title: string;
  }>({ price: '', quantity: '1', sku: '', title: '' });
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [updatingSku, setUpdatingSku] = useState<string | null>(null);

  // Stato Ordini eBay
  const [orders, setOrders] = useState<EbayOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState<boolean>(false);
  const [trackingForms, setTrackingForms] = useState<Record<string, { tracking: string; carrier: string }>>({});
  const [fulfillingOrderId, setFulfillingOrderId] = useState<string | null>(null);

  const loadStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setActionError(null);
    }
    try {
      const info = await fetchEbayConnectionStatus(activeSeller?.id);
      setConnectionInfo(info);
      if (info.isConnected) {
        setPendingAuthUrl(null);
        setActionNotice(`Account eBay Sandbox "${info.ebayUsername || 'Collegato'}" verificato e attivo!`);
        setActionError(null);
      } else if (!isSilent) {
        if (info.status === 'error') {
          setActionError(info.message || 'Errore durante la verifica del collegamento eBay.');
        } else if (info.status === 'not_connected') {
          setActionNotice(
            'Verifica completata: nessun account eBay Sandbox risulta collegato per questo profilo.'
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la verifica';
      if (!isSilent) setActionError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeSeller?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const handleRecheck = () => {
      loadStatus(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRecheck();
      }
    };
    window.addEventListener('focus', handleRecheck);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!pendingAuthUrl || connectionInfo?.isConnected) return;

    let checks = 0;
    const maxChecks = 120;
    const timer = setInterval(async () => {
      checks++;
      try {
        const status = await fetchEbayConnectionStatus(activeSeller?.id);
        if (status.isConnected || status.status === 'connected') {
          clearInterval(timer);
          setConnectionInfo(status);
          setPendingAuthUrl(null);
          setActionNotice('Account eBay Sandbox rilevato e collegato con successo!');
          setActionError(null);
        }
      } catch {
        // Ignora errori transitori
      }
      if (checks >= maxChecks) {
        clearInterval(timer);
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [pendingAuthUrl, connectionInfo?.isConnected, activeSeller?.id]);

  const loadListingsAndWarehouse = useCallback(async () => {
    if (!activeSeller?.id) return;
    setIsLoadingListings(true);

    const [listingsRes, warehouseRes] = await Promise.all([
      fetchEbayListings(),
      fetchSellerInventory({
        sellerId: activeSeller.id,
        filters: {},
        page: 1,
        pageSize: 50,
      }),
    ]);

    if (listingsRes.data) {
      setListings(listingsRes.data);
    }
    if (warehouseRes.data) {
      setWarehouseItems(warehouseRes.data);
    }
    setIsLoadingListings(false);
  }, [activeSeller?.id]);

  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    const res = await fetchLocalEbayOrders();
    if (res.data) {
      setOrders(res.data);
    }
    setIsLoadingOrders(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'listings') {
      loadListingsAndWarehouse();
    } else if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadListingsAndWarehouse, loadOrders]);

  const handleConnect = async () => {
    setActionError(null);
    setActionNotice(null);
    setIsInitiating(true);

    try {
      const res = await initiateEbayOAuth(activeSeller?.id);

      if (!res.success) {
        setActionError(res.error || 'Impossibile avviare il collegamento con eBay Sandbox.');
        setIsInitiating(false);
        return;
      }

      if (res.authorizationUrl) {
        setPendingAuthUrl(res.authorizationUrl);
        setActionNotice(
          'Portale eBay Sandbox pronto per il collegamento. Se il browser non si è aperto automaticamente, utilizza il pulsante "Apri eBay Sandbox".'
        );

        const openRes = await openExternalUrl(res.authorizationUrl);
        if (!openRes.success) {
          setActionNotice(
            'Il popup automatico è stato bloccato dal sistema. Fai clic sul pulsante "Apri eBay Sandbox" qui sotto per procedere.'
          );
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Eccezione imprevista durante l'avvio di OAuth";
      setActionError(msg);
    } finally {
      setIsInitiating(false);
    }
  };

  const confirmDisconnect = async () => {
    setIsDisconnecting(true);
    setActionError(null);
    setActionNotice(null);

    const res = await disconnectEbayAccount();
    if (!res.success) {
      setActionError(res.error || "Errore durante la disconnessione dell'account eBay.");
    } else {
      setActionNotice('Account eBay scollegato con successo.');
      await loadStatus();
    }
    setIsDisconnecting(false);
    setShowDisconnectConfirm(false);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;

    setIsPublishing(true);
    setActionError(null);
    setActionNotice(null);

    const price = parseFloat(publishForm.price) || selectedInventoryItem.price || 10;
    const quantity = parseInt(publishForm.quantity, 10) || selectedInventoryItem.quantity || 1;
    const title = publishForm.title.trim() || selectedInventoryItem.title;
    const sku = publishForm.sku.trim() || `AUT-${selectedInventoryItem.id.slice(0, 8).toUpperCase()}`;

    const res = await publishPartToEbay({
      inventory_id: selectedInventoryItem.id,
      sku,
      title,
      description: selectedInventoryItem.description || undefined,
      price,
      quantity,
      condition: selectedInventoryItem.condition || undefined,
      oem_code: selectedInventoryItem.oem_code || undefined,
      images: [],
    });

    if (!res.success) {
      setActionError(res.error || 'Errore durante la pubblicazione del ricambio su eBay.');
    } else {
      setActionNotice(res.message || `Ricambio ${sku} pubblicato con successo su eBay Sandbox!`);
      setSelectedInventoryItem(null);
      await loadListingsAndWarehouse();
    }
    setIsPublishing(false);
  };

  const handleSyncQuantity = async (listing: EbayListingItem, newQuantity: number) => {
    setUpdatingSku(listing.sku);
    setActionError(null);
    setActionNotice(null);

    const res = await syncEbayInventoryQuantity(
      listing.sku,
      newQuantity,
      listing.inventory_id || undefined
    );
    if (!res.success) {
      setActionError(res.error || `Errore sincronizzazione giacenza per SKU ${listing.sku}`);
    } else {
      setActionNotice(res.message || `Giacenza per ${listing.sku} aggiornata a ${newQuantity} pezzi.`);
      await loadListingsAndWarehouse();
    }
    setUpdatingSku(null);
  };

  const handleSyncOrders = async () => {
    setIsSyncingOrders(true);
    setActionError(null);
    setActionNotice(null);

    const res = await syncOrdersFromEbay();
    if (!res.success) {
      setActionError(res.error || 'Impossibile scaricare gli ordini da eBay Fulfillment API.');
    } else {
      setActionNotice(
        res.message || `Scaricati e sincronizzati ${res.orders.length} ordini eBay Sandbox!`
      );
      await loadOrders();
    }
    setIsSyncingOrders(false);
  };

  const handleFulfillOrder = async (orderId: string, ebayOrderId: string) => {
    const form = trackingForms[orderId];
    if (!form || !form.tracking.trim()) {
      setActionError('Inserisci un codice di tracking valido prima di completare la spedizione.');
      return;
    }

    setFulfillingOrderId(orderId);
    setActionError(null);
    setActionNotice(null);

    const res = await fulfillEbayOrder(ebayOrderId, form.tracking.trim(), form.carrier);
    if (!res.success) {
      setActionError(res.error || 'Errore invio tracking a eBay.');
    } else {
      setActionNotice(res.message || `Ordine ${ebayOrderId} contrassegnato come spedito su eBay!`);
      await loadOrders();
    }
    setFulfillingOrderId(null);
  };

  const isConnected = Boolean(connectionInfo?.isConnected);
  const backendUrl = getEbayOAuthBackendBaseUrl();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7F7] font-sans text-[#1A2322] overflow-y-auto select-text">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-[#E2E8E7] space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#5C6B68]">
              <span className="font-semibold text-[#074E44]">
                {activeSeller?.business_name || 'Autodemolitore'}
              </span>
              <span>•</span>
              <StatusBadge tone="brand">
                <Globe className="w-3 h-3" />
                <span>eBay Sandbox</span>
              </StatusBadge>
            </div>
            <h1 className="text-xl font-bold text-[#162220] mt-1">Canale di Vendita eBay</h1>
            <p className="text-xs text-[#5C6B68] mt-0.5">
              Collegamento OAuth 2.0 protetto, pubblicazione inserzioni ricambi, sincronizzazione giacenze ed evasione ordini.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunDiagnostics}
                loading={isDiagnosing}
                title="Esegui diagnostica completa end-to-end (Riservato Admin)"
              >
                {!isDiagnosing && <Wrench className="w-3.5 h-3.5 text-[#074E44]" />}
                <span>Diagnostica Canale</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (activeTab === 'oauth') loadStatus();
                else if (activeTab === 'listings') loadListingsAndWarehouse();
                else if (activeTab === 'orders') loadOrders();
              }}
              disabled={isLoading || isInitiating || isLoadingListings || isLoadingOrders}
              title="Aggiorna dati"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading || isLoadingListings || isLoadingOrders
                    ? 'animate-spin text-[#074E44]'
                    : ''
                }`}
              />
              <span>Aggiorna</span>
            </Button>
          </div>
        </div>

        {/* Navigazione Schede */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EEF2F1] border border-[#DCE5E3]">
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'oauth'
                ? 'bg-white text-[#074E44] shadow-xs'
                : 'text-[#5C6B68] hover:text-[#1A2322]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Collegamento Account (OAuth)</span>
            {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'listings'
                ? 'bg-white text-[#074E44] shadow-xs'
                : 'text-[#5C6B68] hover:text-[#1A2322]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Annunci & Giacenze eBay</span>
            {listings.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EAF3F1] text-[#074E44] font-mono tabular-nums">
                {listings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white text-[#074E44] shadow-xs'
                : 'text-[#5C6B68] hover:text-[#1A2322]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ordini eBay & Evasione</span>
            {orders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono tabular-nums">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Corpo principale */}
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {actionNotice && (
          <AlertBanner
            tone="info"
            onDismiss={!pendingAuthUrl ? () => setActionNotice(null) : undefined}
            action={
              pendingAuthUrl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={async () => {
                      await openExternalUrl(pendingAuthUrl);
                    }}
                  >
                    <span>Apri eBay Sandbox</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={async () => {
                      const ok = await copyExternalUrl(pendingAuthUrl);
                      if (ok) {
                        setCopiedItem('auth_url_banner');
                        setTimeout(() => setCopiedItem(null), 3000);
                      }
                    }}
                  >
                    {copiedItem === 'auth_url_banner' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copiato</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copia Link</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : undefined
            }
          >
            {actionNotice}
          </AlertBanner>
        )}

        {actionError && (
          <AlertBanner
            tone="danger"
            title="Avviso Operazione"
            onDismiss={() => setActionError(null)}
            action={
              isAdmin ? (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleRunDiagnostics}
                  loading={isDiagnosing}
                >
                  {!isDiagnosing && <Wrench className="w-3.5 h-3.5 text-[#074E44]" />}
                  <span>Diagnostica Automatica</span>
                </Button>
              ) : undefined
            }
          >
            {actionError}
          </AlertBanner>
        )}

        {/* SCHEDA 1: COLLEGAMENTO OAUTH */}
        {activeTab === 'oauth' && (
          <div className="space-y-6">
            <div className={`${uiClasses.card} p-6`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isLoading
                        ? 'bg-[#EAF3F1] border-[#C6DFDA] text-[#074E44]'
                        : isConnected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : pendingAuthUrl || connectionInfo?.status === 'backend_not_configured'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : connectionInfo?.status === 'error'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-[#F5F7F7] border-[#E2E8E7] text-[#5C6B68]'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isConnected ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : pendingAuthUrl ? (
                      <Sparkles className="w-6 h-6" />
                    ) : connectionInfo?.status === 'error' ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <Globe className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[#162220]">
                        {isLoading
                          ? 'Verifica Canale eBay in corso...'
                          : isConnected
                          ? 'Account eBay Sandbox Collegato'
                          : pendingAuthUrl
                          ? 'Autorizzazione eBay Sandbox in corso'
                          : connectionInfo?.status === 'error'
                          ? 'Stato Collegamento non verificabile'
                          : 'Collega Account eBay Sandbox'}
                      </h2>

                      {isLoading ? (
                        <StatusBadge tone="brand">Verifica in corso</StatusBadge>
                      ) : isConnected ? (
                        <StatusBadge tone="success">Attivo & Autorizzato</StatusBadge>
                      ) : pendingAuthUrl ? (
                        <StatusBadge tone="warning">In attesa di autorizzazione</StatusBadge>
                      ) : connectionInfo?.status === 'error' ? (
                        <StatusBadge tone="danger">Errore di Verifica</StatusBadge>
                      ) : connectionInfo?.status === 'backend_not_configured' ? (
                        <StatusBadge tone="warning">Configurazione Backend</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Disconnesso</StatusBadge>
                      )}
                    </div>

                    <p className="text-xs text-[#5C6B68] max-w-2xl leading-relaxed">
                      {isConnected
                        ? `L'account eBay Sandbox "${
                            connectionInfo?.ebayUsername || 'Autodemolitore'
                          }" è autorizzato con token di sicurezza cifrato AES-256-GCM. Puoi pubblicare inserzioni e ricevere ordini.`
                        : pendingAuthUrl
                        ? "Sessione di autenticazione aperta nel browser esterno. Completa l'accesso su eBay Sandbox e concedi i consensi. Autopia Manager aggiornerà automaticamente lo stato."
                        : connectionInfo?.status === 'error'
                        ? `Verifica non riuscita: ${
                            connectionInfo?.message ||
                            'Impossibile verificare lo stato con il backend.'
                          }${
                            isAdmin
                              ? ' Clicca su "Diagnostica Canale" per maggiori dettagli.'
                              : ''
                          }`
                        : 'Autorizza Autopia Manager a sincronizzare annunci, giacenze magazzino e ordini con eBay Sandbox tramite il flusso sicuro OAuth 2.0.'}
                    </p>

                    {isConnected && connectionInfo?.tokenExpiresAt && (
                      <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#5C6B68] tabular-nums">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#8A9895]" />
                          <span>
                            Scadenza sessione:{' '}
                            {new Date(connectionInfo.tokenExpiresAt).toLocaleDateString('it-IT')}{' '}
                            {new Date(connectionInfo.tokenExpiresAt).toLocaleTimeString('it-IT')}
                          </span>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          • Refresh automatico abilitato
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  {!isConnected ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleConnect}
                      loading={isInitiating}
                      disabled={isLoading}
                    >
                      {!isInitiating && <ExternalLink className="w-4 h-4" />}
                      <span>
                        {isInitiating ? 'Generazione State CSRF...' : 'Collega Account eBay'}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setShowDisconnectConfirm(true)}
                      disabled={isDisconnecting}
                      className="text-red-700 border-red-200 hover:bg-red-50"
                    >
                      <Unplug className="w-4 h-4" />
                      <span>Scollega Account</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Box Sessione OAuth eBay Attiva */}
              {pendingAuthUrl && !isConnected && (
                <div className="mt-6 p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-700" />
                        <span>Autorizzazione eBay Sandbox in corso</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed max-w-xl">
                        La sessione di accesso con eBay Sandbox è pronta. Accedi con il tuo account
                        sviluppatore eBay e clicca su <strong>"Agree"</strong> per completare il
                        collegamento.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAuthUrl(null)}
                      className="text-amber-800 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100 cursor-pointer"
                      title="Annulla sessione"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        await openExternalUrl(pendingAuthUrl);
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Apri eBay Sandbox nel Browser</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const ok = await copyExternalUrl(pendingAuthUrl);
                        if (ok) {
                          setCopiedItem('auth_url_card');
                          setTimeout(() => setCopiedItem(null), 3000);
                        }
                      }}
                    >
                      {copiedItem === 'auth_url_card' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Link Copiato</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copia Link di Accesso</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => loadStatus(false)}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Verifica Collegamento Ora</span>
                    </Button>
                  </div>

                  <div className="pt-1">
                    <div className="text-[10px] text-[#5C6B68] uppercase font-semibold">
                      URL di autorizzazione generato:
                    </div>
                    <div className="mt-1 p-2 bg-white rounded-lg border border-[#E2E8E7] font-mono text-[11px] text-[#3F4E4B] break-all select-all flex items-center justify-between gap-2">
                      <span className="truncate">{pendingAuthUrl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          copyExternalUrl(pendingAuthUrl);
                          setCopiedItem('auth_url_card');
                          setTimeout(() => setCopiedItem(null), 3000);
                        }}
                        className="text-[#074E44] hover:underline text-[11px] shrink-0 font-sans font-semibold cursor-pointer"
                      >
                        {copiedItem === 'auth_url_card' ? 'Copiato' : 'Copia'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dettagli Tecnico-Architetturali */}
              <div className="mt-6 pt-4 border-t border-[#EEF2F1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6B68]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                  <span>
                    Zero-Trust Architecture: Segreti eBay gestiti esclusivamente lato server
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowArchitectureDetails(!showArchitectureDetails)}
                  className="text-[#074E44] hover:underline font-semibold cursor-pointer"
                >
                  {showArchitectureDetails ? 'Nascondi Dettagli' : 'Mostra Configurazione Endpoint'}
                </button>
              </div>

              {showArchitectureDetails && (
                <div className="mt-4 p-4 rounded-xl bg-[#FAFBFB] border border-[#E2E8E7] text-xs text-[#2E3C3A]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-[#5C6B68] block mb-0.5">Endpoint Backend:</span>
                      <code className="text-[#074E44] font-mono font-semibold">{backendUrl}</code>
                    </div>
                    <div>
                      <span className="text-[#5C6B68] block mb-0.5">RuName eBay:</span>
                      <code className="text-[#1A2322] font-mono">
                        Configurato su developer.ebay.com (Sandbox)
                      </code>
                    </div>
                    <div>
                      <span className="text-[#5C6B68] block mb-0.5">Cifratura Token:</span>
                      <span className="text-emerald-700 font-mono font-semibold">
                        AES-256-GCM (AuthTag 128-bit)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5C6B68] block mb-0.5">Permessi Richiesti:</span>
                      <span className="text-[#1A2322] font-mono">
                        sell.inventory, sell.account, sell.fulfillment
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCHEDA 2: ANNUNCI & GIACENZE EBAY */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className={`${uiClasses.card} p-6 space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF3F1] text-[#074E44] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#162220]">
                      Pubblica Ricambio da Magazzino su eBay Sandbox
                    </h2>
                    <p className="text-xs text-[#5C6B68]">
                      Seleziona un articolo dal magazzino per generare l'inserzione a prezzo fisso.
                    </p>
                  </div>
                </div>

                {selectedInventoryItem && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedInventoryItem(null)}
                  >
                    Annulla selezione
                  </Button>
                )}
              </div>

              {selectedInventoryItem ? (
                <form
                  onSubmit={handlePublish}
                  className="bg-[#FAFBFB] p-4 rounded-xl border border-[#C6DFDA] space-y-4"
                >
                  <div className="text-xs font-bold text-[#074E44] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Configurazione Inserzione: {selectedInventoryItem.title}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className={uiClasses.label}>Titolo Annuncio eBay (max 80 car.)</label>
                      <input
                        type="text"
                        maxLength={80}
                        value={publishForm.title}
                        onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                        className={uiClasses.input}
                        required
                      />
                    </div>

                    <div>
                      <label className={uiClasses.label}>Prezzo di Vendita (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={publishForm.price}
                        onChange={(e) => setPublishForm({ ...publishForm, price: e.target.value })}
                        className={`${uiClasses.input} tabular-nums font-semibold`}
                        required
                      />
                    </div>

                    <div>
                      <label className={uiClasses.label}>Quantità Disponibile</label>
                      <input
                        type="number"
                        min="1"
                        value={publishForm.quantity}
                        onChange={(e) =>
                          setPublishForm({ ...publishForm, quantity: e.target.value })
                        }
                        className={`${uiClasses.input} tabular-nums font-semibold`}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8E7]">
                    <div className="text-[11px] text-[#5C6B68]">
                      Codice OEM:{' '}
                      <span className="text-[#1A2322] font-mono font-semibold">
                        {selectedInventoryItem.oem_code || 'Non specificato'}
                      </span>{' '}
                      • SKU:{' '}
                      <span className="text-[#074E44] font-mono font-semibold">
                        {publishForm.sku}
                      </span>
                    </div>

                    <Button type="submit" variant="primary" size="sm" loading={isPublishing}>
                      {!isPublishing && <Send className="w-3.5 h-3.5" />}
                      <span>
                        {isPublishing ? 'Pubblicazione su eBay...' : 'Conferma e Pubblica Annuncio'}
                      </span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#5C6B68]">
                    Ricambi disponibili a magazzino ({warehouseItems.length}):
                  </div>
                  {warehouseItems.length === 0 ? (
                    <div className="p-4 bg-[#FAFBFB] rounded-xl border border-[#E2E8E7] text-center text-xs text-[#5C6B68]">
                      Nessun ricambio trovato in magazzino. Aggiungi ricambi nella sezione "Magazzino Ricambi" per pubblicarli su eBay.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E2E8E7] divide-y divide-[#EEF2F1] bg-white">
                      {warehouseItems.slice(0, 8).map((item) => (
                        <div
                          key={item.id}
                          className="p-3 hover:bg-[#F7FAF9] flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#1A2322] truncate">{item.title}</div>
                            <div className="text-[11px] text-[#5C6B68] flex flex-wrap items-center gap-3 mt-0.5 tabular-nums">
                              <span>
                                Prezzo:{' '}
                                <strong className="text-[#074E44]">
                                  € {item.price?.toFixed(2) || '0.00'}
                                </strong>
                              </span>
                              <span>
                                Giacenza:{' '}
                                <strong className="text-[#1A2322]">{item.quantity} pz</strong>
                              </span>
                              {item.oem_code && (
                                <span>
                                  OEM: <code className="font-mono">{item.oem_code}</code>
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setSelectedInventoryItem(item);
                              setPublishForm({
                                title: item.title,
                                price: item.price ? item.price.toString() : '25.00',
                                quantity: item.quantity ? item.quantity.toString() : '1',
                                sku: `AUT-${item.id.slice(0, 8).toUpperCase()}`,
                              });
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 text-[#074E44]" />
                            <span>Prepara Annuncio</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Elenco Inserzioni Pubblicate */}
            <div className={`${uiClasses.card} p-6 space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#074E44]" />
                  <h2 className="text-base font-bold text-[#162220]">
                    Inserzioni eBay Attive & Sincronizzazione Giacenze
                  </h2>
                </div>
                <span className="text-xs text-[#5C6B68] font-mono tabular-nums">
                  {listings.length} inserzioni
                </span>
              </div>

              {listings.length === 0 ? (
                <EmptyState
                  icon={<Store className="w-5 h-5" />}
                  title="Nessun annuncio pubblicato su eBay"
                  description="Seleziona un ricambio dal magazzino nel riquadro sopra per pubblicarlo sul marketplace eBay Sandbox."
                />
              ) : (
                <div className={uiClasses.tableWrapper}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={uiClasses.tableHeadRow}>
                          <th className="py-2.5 px-3">SKU / Item ID</th>
                          <th className="py-2.5 px-3">Titolo Inserzione</th>
                          <th className="py-2.5 px-3">Prezzo</th>
                          <th className="py-2.5 px-3">Giacenza eBay</th>
                          <th className="py-2.5 px-3">Stato</th>
                          <th className="py-2.5 px-3 text-right">Azione Rapida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2F1]">
                        {listings.map((l) => (
                          <tr key={l.id} className="hover:bg-[#F7FAF9] transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-[#074E44]">
                              <div>{l.sku}</div>
                              {l.ebay_item_id && (
                                <div className="text-[10px] text-[#5C6B68]">ID: {l.ebay_item_id}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#1A2322] max-w-xs truncate">
                              {l.title}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#074E44] tabular-nums">
                              € {l.price.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 tabular-nums">
                              <span
                                className={`font-mono font-bold ${
                                  l.quantity > 0 ? 'text-[#1A2322]' : 'text-red-700'
                                }`}
                              >
                                {l.quantity} pz
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <StatusBadge
                                tone={
                                  l.status === 'published'
                                    ? 'success'
                                    : l.status === 'out_of_stock'
                                    ? 'danger'
                                    : 'neutral'
                                }
                              >
                                {l.status}
                              </StatusBadge>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => handleSyncQuantity(l, l.quantity + 1)}
                                  disabled={updatingSku === l.sku}
                                  title="Aumenta di 1 pezzo"
                                >
                                  +1
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => handleSyncQuantity(l, Math.max(0, l.quantity - 1))}
                                  disabled={updatingSku === l.sku}
                                  title="Diminuisci di 1 pezzo"
                                >
                                  -1
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => handleSyncQuantity(l, 0)}
                                  disabled={updatingSku === l.sku}
                                  className="text-red-700 border-red-200 hover:bg-red-50"
                                  title="Azzera giacenza su eBay"
                                >
                                  Scarica
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCHEDA 3: ORDINI EBAY & EVASIONE */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className={`${uiClasses.card} p-6 space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#162220] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#074E44]" />
                    <span>Ricezione Ordini eBay Sandbox & Scarico Magazzino</span>
                  </h2>
                  <p className="text-xs text-[#5C6B68] mt-0.5">
                    Scarica gli ordini confermati su eBay Sandbox. Lo scarico scala automaticamente la disponibilità in magazzino.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSyncOrders}
                  loading={isSyncingOrders}
                >
                  {!isSyncingOrders && <RefreshCw className="w-3.5 h-3.5" />}
                  <span>
                    {isSyncingOrders ? 'Download Ordini...' : 'Sincronizza Ordini eBay'}
                  </span>
                </Button>
              </div>

              {orders.length === 0 ? (
                <EmptyState
                  icon={<ShoppingBag className="w-5 h-5" />}
                  title="Nessun ordine eBay registrato localmente"
                  description='Clicca su "Sincronizza Ordini eBay" per interrogare il canale eBay e importare le vendite effettuate.'
                />
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const form = trackingForms[order.id] || {
                      tracking: '',
                      carrier: 'BRT Corriere Espresso',
                    };

                    return (
                      <div
                        key={order.id}
                        className="p-4 bg-[#FAFBFB] rounded-xl border border-[#E2E8E7] space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8E7]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#074E44] text-xs">
                              Ordine #{order.ebay_order_id}
                            </span>
                            <StatusBadge
                              tone={order.order_status === 'SHIPPED' ? 'brand' : 'success'}
                            >
                              {order.order_status === 'SHIPPED' ? 'Spedito' : 'Pagato • Da Spedire'}
                            </StatusBadge>
                          </div>

                          <div className="text-xs text-[#5C6B68] tabular-nums">
                            Data:{' '}
                            <span className="text-[#1A2322] font-medium">
                              {new Date(order.creation_date).toLocaleDateString('it-IT')}
                            </span>{' '}
                            • Totale:{' '}
                            <strong className="text-[#074E44] font-mono text-sm">
                              € {order.total_price.toFixed(2)} {order.currency}
                            </strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-lg border border-[#E2E8E7] space-y-1">
                            <div className="text-[#5C6B68] text-[11px] font-semibold flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-[#074E44]" />
                              <span>Indirizzo di Spedizione</span>
                            </div>
                            <div className="font-bold text-[#1A2322]">
                              {order.buyer_name} ({order.buyer_username})
                            </div>
                            <div className="text-[#5C6B68] text-[11px]">
                              {order.shipping_address?.addressLine1 || 'Indirizzo registrato su eBay'},{' '}
                              {order.shipping_address?.postalCode} {order.shipping_address?.city} (
                              {order.shipping_address?.countryCode || 'IT'})
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-[#E2E8E7] space-y-1">
                            <div className="text-[#5C6B68] text-[11px] font-semibold">
                              Articoli Venduti
                            </div>
                            <div className="divide-y divide-[#EEF2F1]">
                              {order.line_items?.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="py-1 flex items-center justify-between text-[11px] tabular-nums"
                                >
                                  <span className="text-[#1A2322] font-medium truncate max-w-xs">
                                    {item.title}
                                  </span>
                                  <span className="font-mono text-[#074E44] font-semibold">
                                    {item.quantity} pz • € {item.lineItemCost}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {order.order_status !== 'SHIPPED' ? (
                          <div className="p-3 bg-[#EAF3F1]/60 rounded-lg border border-[#C6DFDA] flex flex-col sm:flex-row sm:items-center gap-2.5">
                            <div className="text-xs text-[#074E44] font-semibold shrink-0">
                              Evasione Spedizione eBay:
                            </div>

                            <select
                              value={form.carrier}
                              onChange={(e) =>
                                setTrackingForms({
                                  ...trackingForms,
                                  [order.id]: { ...form, carrier: e.target.value },
                                })
                              }
                              className={`${uiClasses.select} sm:w-48`}
                            >
                              <option value="BRT Corriere Espresso">BRT Corriere Espresso</option>
                              <option value="GLS Italy">GLS Italy</option>
                              <option value="DHL Express">DHL Express</option>
                              <option value="Poste Italiane">Poste Italiane</option>
                              <option value="SDA Express Courier">SDA Express Courier</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Inserisci Tracking Number..."
                              value={form.tracking}
                              onChange={(e) =>
                                setTrackingForms({
                                  ...trackingForms,
                                  [order.id]: { ...form, tracking: e.target.value },
                                })
                              }
                              className={`${uiClasses.input} flex-1 font-mono`}
                            />

                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleFulfillOrder(order.id, order.ebay_order_id)}
                              loading={fulfillingOrderId === order.id}
                            >
                              {fulfillingOrderId !== order.id && <Send className="w-3.5 h-3.5" />}
                              <span>{fulfillingOrderId === order.id ? 'Invio...' : 'Invia Tracking'}</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-white rounded-lg border border-[#E2E8E7] text-xs text-[#3F4E4B] flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#074E44] shrink-0" />
                            <span>
                              Spedizione completata con{' '}
                              <strong>{order.carrier_code || 'Corriere'}</strong> • Tracking:{' '}
                              <code className="text-[#074E44] font-mono font-semibold">
                                {order.tracking_number}
                              </code>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modale Conferma Disconnessione eBay */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8E7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-700">
                <Unplug className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#162220]">Scollega Account eBay</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(false)}
                className="p-1 text-[#5C6B68] hover:text-[#1A2322] rounded-lg hover:bg-[#F3F6F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#3F4E4B] leading-relaxed">
              Sei sicuro di voler scollegare l'account eBay Sandbox da Autopia Manager? Potrai rieffettuare il collegamento in qualsiasi momento.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEF2F1]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDisconnectConfirm(false)}
                disabled={isDisconnecting}
              >
                Annulla
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isDisconnecting}
                onClick={confirmDisconnect}
              >
                {isDisconnecting ? 'Disconnessione...' : 'Scollega Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Diagnostica Completa Canale eBay (Riservata Esclusivamente all'Admin) */}
      {showDiagnosticsModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8E7] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEF2F1] flex items-center justify-between bg-[#FAFBFB]">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-[#074E44]" />
                <h3 className="text-base font-bold text-[#162220]">
                  Diagnostica Canale eBay (Sandbox)
                </h3>
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setShowDiagnosticsModal(false)}
              >
                Chiudi
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {isDiagnosing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#074E44]" />
                  <p className="text-sm font-semibold text-[#162220]">
                    Verifica architettura eBay in corso...
                  </p>
                  <p className="text-xs text-[#5C6B68] max-w-xs">
                    Interrogazione del database Supabase, verifica sessione e test dell'endpoint backend.
                  </p>
                </div>
              ) : diagnosticsReport ? (
                <div className="space-y-4">
                  <AlertBanner
                    tone={diagnosticsReport.allPassed ? 'success' : 'warning'}
                    title={
                      diagnosticsReport.allPassed
                        ? 'Tutti i componenti sono allineati e pronti'
                        : 'Punti di configurazione rilevati'
                    }
                    action={
                      <Button variant="secondary" size="xs" onClick={handleRunDiagnostics}>
                        <RefreshCw className="w-3 h-3 text-[#074E44]" />
                        <span>Riesegui</span>
                      </Button>
                    }
                  >
                    {new Date(diagnosticsReport.timestamp).toLocaleTimeString('it-IT')} — Verifica end-to-end
                  </AlertBanner>

                  <div className="space-y-2.5">
                    {diagnosticsReport.checks.map((check) => (
                      <div
                        key={check.id}
                        className="p-3.5 bg-[#FAFBFB] border border-[#E2E8E7] rounded-xl space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {check.status === 'ok' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            {check.status === 'warning' && (
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                            {check.status === 'error' && (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <span className="font-semibold text-[#1A2322] text-xs">
                              {check.name}
                            </span>
                          </div>

                          <StatusBadge
                            tone={
                              check.status === 'ok'
                                ? 'success'
                                : check.status === 'warning'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {check.status.toUpperCase()}
                          </StatusBadge>
                        </div>

                        <p className="text-[#3F4E4B] text-xs pl-6">{check.message}</p>

                        {check.suggestion && (
                          <div className="ml-6 p-2.5 bg-white border border-[#E2E8E7] rounded-lg text-[11px] text-[#074E44] flex items-start justify-between gap-2">
                            <span className="font-mono break-all">{check.suggestion}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(check.suggestion!, check.id)}
                              className="text-[#5C6B68] hover:text-[#074E44] shrink-0 cursor-pointer p-1"
                              title="Copia suggerimento"
                            >
                              {copiedItem === check.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#EEF2F1] space-y-2">
                    <div className="text-[11px] font-bold text-[#5C6B68] uppercase tracking-wider">
                      Guida Rapida Configurazione
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-[#FAFBFB] border border-[#E2E8E7] rounded-xl space-y-2">
                        <div className="font-semibold text-[#1A2322] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#074E44]" />
                          <span>1. Schema SQL Supabase</span>
                        </div>
                        <p className="text-[11px] text-[#5C6B68]">
                          Crea le tabelle isolate{' '}
                          <code className="text-[#074E44]">ebay_oauth_states</code> e{' '}
                          <code className="text-[#074E44]">seller_ebay_tokens</code>.
                        </p>
                        <Button
                          variant="secondary"
                          size="xs"
                          className="w-full"
                          onClick={() => {
                            const sqlSnippet = `-- Esegui in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.ebay_oauth_states (
  state_token VARCHAR(64) PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at TIMESTAMPTZ
);
ALTER TABLE public.ebay_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.seller_ebay_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
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
  CONSTRAINT uq_seller_ebay_env UNIQUE (seller_id, environment)
);
ALTER TABLE public.seller_ebay_tokens ENABLE ROW LEVEL SECURITY;`;
                            copyToClipboard(sqlSnippet, 'sql');
                          }}
                        >
                          {copiedItem === 'sql' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiato negli Appunti</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copia SQL per Supabase</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="p-3 bg-[#FAFBFB] border border-[#E2E8E7] rounded-xl space-y-2">
                        <div className="font-semibold text-[#1A2322] flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#074E44]" />
                          <span>2. Variabili Netlify</span>
                        </div>
                        <p className="text-[11px] text-[#5C6B68]">
                          Configura le variabili in <em>Site configuration → Environment variables</em>.
                        </p>
                        <Button
                          variant="secondary"
                          size="xs"
                          className="w-full"
                          onClick={() => {
                            const envList = `SUPABASE_URL=https://ilcpmmgjkzrjyklqdpfl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
EBAY_SANDBOX_CLIENT_ID=YOUR_EBAY_SANDBOX_APP_ID
EBAY_SANDBOX_CLIENT_SECRET=YOUR_EBAY_SANDBOX_CERT_ID
EBAY_SANDBOX_RUNAME=YOUR_EBAY_SANDBOX_RUNAME
EBAY_TOKEN_ENCRYPTION_KEY=64_HEX_CHARACTERS_32_BYTES_KEY`;
                            copyToClipboard(envList, 'env');
                          }}
                        >
                          {copiedItem === 'env' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiate negli Appunti</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copia Variabili Netlify</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
