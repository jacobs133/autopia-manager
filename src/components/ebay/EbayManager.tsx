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
  ShieldAlert,
  Lock,
  KeyRound,
  Store,
  Layers,
  ArrowRight,
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
  Eye,
  Check,
  RotateCcw,
  Wrench,
  Copy,
  ChevronDown,
  ChevronUp,
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

type EbayTab = 'oauth' | 'listings' | 'orders';

export const EbayManager: React.FC = () => {
  const { user, sellerProfile, effectiveSellerProfile, isAdmin } = useAuth();
  const activeSeller = effectiveSellerProfile || sellerProfile;

  const [activeTab, setActiveTab] = useState<EbayTab>('oauth');

  // Stato Connessione OAuth
  const [connectionInfo, setConnectionInfo] = useState<EbayConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showArchitectureDetails, setShowArchitectureDetails] = useState<boolean>(false);

  // Stato Diagnostica Canale eBay
  const [diagnosticsReport, setDiagnosticsReport] = useState<EbayDiagnosticsReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [pendingAuthUrl, setPendingAuthUrl] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
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

  // Stato Inserzioni eBay (Fase 3B)
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

  // Stato Ordini eBay (Fase 3C)
  const [orders, setOrders] = useState<EbayOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState<boolean>(false);
  const [trackingForms, setTrackingForms] = useState<Record<string, { tracking: string; carrier: string }>>({});
  const [fulfillingOrderId, setFulfillingOrderId] = useState<string | null>(null);

  // 1. Caricamento dello stato effettivo OAuth dal backend
  const loadStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setActionError(null);
    }
    const info = await fetchEbayConnectionStatus(activeSeller?.id);
    setConnectionInfo(info);
    if (info.isConnected) {
      setPendingAuthUrl(null);
      setActionNotice(null);
    }
    setIsLoading(false);
  }, [activeSeller?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Rileva istantaneamente il ritorno dell'utente dal browser eBay ad Autopia Manager
  useEffect(() => {
    const handleFocus = () => {
      loadStatus(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadStatus]);

  // 2. Caricamento Inserzioni e Magazzino per Fase 3B
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

  // 3. Caricamento Ordini per Fase 3C
  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    const res = await fetchLocalEbayOrders();
    if (res.data) {
      setOrders(res.data);
    }
    setIsLoadingOrders(false);
  }, []);

  // Gestione cambio tab
  useEffect(() => {
    if (activeTab === 'listings') {
      loadListingsAndWarehouse();
    } else if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadListingsAndWarehouse, loadOrders]);

  // Avvio del collegamento OAuth con reindirizzamento al portale eBay Sandbox
  const handleConnect = async () => {
    setActionError(null);
    setActionNotice(null);
    setIsInitiating(true);

    try {
      const res = await initiateEbayOAuth();

      if (!res.success) {
        setActionError(res.error || 'Impossibile avviare il collegamento con eBay Sandbox.');
        setIsInitiating(false);
        return;
      }

      if (res.authorizationUrl) {
        setPendingAuthUrl(res.authorizationUrl);
        setActionNotice(
          'Portale eBay Sandbox pronto per il collegamento! Se il browser non si è aperto in automatico, fai clic sul pulsante arancione "Apri eBay Sandbox" o copia il link.'
        );

        // Tentativo di apertura automatica con il servizio esterno affidabile (Tauri + browser)
        const openRes = await openExternalUrl(res.authorizationUrl);
        if (!openRes.success) {
          setActionNotice(
            'Il popup automatico è stato bloccato dal sistema. Fai clic sul pulsante arancione "Apri eBay Sandbox" qui sotto per procedere.'
          );
        }

        // Controllo periodico automatico dello stato ogni 2.5 secondi per rilevare l'avvenuto collegamento
        let checks = 0;
        const interval = setInterval(async () => {
          checks++;
          const status = await fetchEbayConnectionStatus(activeSeller?.id);
          if (status.isConnected || status.status === 'connected') {
            clearInterval(interval);
            setPendingAuthUrl(null);
            setActionNotice('Account eBay Sandbox collegato e autorizzato con successo!');
            await loadStatus(true);
          }
          if (checks >= 120) {
            clearInterval(interval); // Timeout dopo 5 minuti
          }
        }, 2500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eccezione imprevista durante l\'avvio di OAuth';
      setActionError(msg);
    } finally {
      setIsInitiating(false);
    }
  };

  // Disconnessione dell'account eBay
  const handleDisconnect = async () => {
    if (!window.confirm('Sei sicuro di voler scollegare l\'account eBay Sandbox da Autopia Manager?')) {
      return;
    }

    setIsDisconnecting(true);
    setActionError(null);
    setActionNotice(null);

    const res = await disconnectEbayAccount();
    if (!res.success) {
      setActionError(res.error || 'Errore durante la disconnessione dell\'account eBay.');
    } else {
      setActionNotice('Account eBay scollegato con successo.');
      await loadStatus();
    }
    setIsDisconnecting(false);
  };

  // Pubblicazione Ricambio su eBay (Fase 3B)
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

  // Sincronizzazione Giacenza Singolo Articolo eBay (Fase 3B)
  const handleSyncQuantity = async (listing: EbayListingItem, newQuantity: number) => {
    setUpdatingSku(listing.sku);
    setActionError(null);
    setActionNotice(null);

    const res = await syncEbayInventoryQuantity(listing.sku, newQuantity, listing.inventory_id || undefined);
    if (!res.success) {
      setActionError(res.error || `Errore sincronizzazione giacenza per SKU ${listing.sku}`);
    } else {
      setActionNotice(res.message || `Giacenza per ${listing.sku} aggiornata a ${newQuantity} pezzi.`);
      await loadListingsAndWarehouse();
    }
    setUpdatingSku(null);
  };

  // Sincronizzazione Ordini da eBay Fulfillment API (Fase 3C)
  const handleSyncOrders = async () => {
    setIsSyncingOrders(true);
    setActionError(null);
    setActionNotice(null);

    const res = await syncOrdersFromEbay();
    if (!res.success) {
      setActionError(res.error || 'Impossibile scaricare gli ordini da eBay Fulfillment API.');
    } else {
      setActionNotice(res.message || `Scaricati e sincronizzati ${res.orders.length} ordini eBay Sandbox!`);
      await loadOrders();
    }
    setIsSyncingOrders(false);
  };

  // Evasione Ordine con Tracking (Fase 3C)
  const handleFulfillOrder = async (orderId: string, ebayOrderId: string) => {
    const form = trackingForms[orderId];
    if (!form || !form.tracking.trim()) {
      alert('Inserisci un codice di tracking valido prima di completare la spedizione.');
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
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6 font-sans select-text">
      {/* 1. Intestazione Canale eBay */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex items-center space-x-1">
              <Globe className="w-3 h-3 text-amber-400" />
              <span>Ambiente eBay Sandbox</span>
            </span>
            <span className="text-xs text-slate-500">Integrazione Completa Fasi 3A • 3B • 3C</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1 flex items-center space-x-2.5">
            <span>Canale di Vendita eBay</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            OAuth 2.0 protetto, pubblicazione annunci ricambi, sincronizzazione giacenze magazzino e gestione ordini di vendita.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Esegui diagnostica completa end-to-end"
          >
            {isDiagnosing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Diagnostica Canale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'oauth') loadStatus();
              else if (activeTab === 'listings') loadListingsAndWarehouse();
              else if (activeTab === 'orders') loadOrders();
            }}
            disabled={isLoading || isInitiating || isLoadingListings || isLoadingOrders}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Aggiorna dati"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoading || isLoadingListings || isLoadingOrders ? 'animate-spin text-amber-400' : 'text-slate-400'
              }`}
            />
            <span>Ricarica</span>
          </button>
        </div>
      </div>

      {/* Navigatore Schede Fasi (3A, 3B, 3C) */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('oauth')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'oauth'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Fase 3A: Collegamento Account (OAuth)</span>
          {isConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'listings'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Fase 3B: Annunci & Giacenze eBay</span>
          {listings.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
              {listings.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Fase 3C: Ordini eBay & Evasione</span>
          {orders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
              {orders.length}
            </span>
          )}
        </button>
      </div>

      {/* Banner Notifiche ed Errori */}
      {actionNotice && (
        <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{actionNotice}</div>
          </div>
          {pendingAuthUrl && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await openExternalUrl(pendingAuthUrl);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <span>Apri eBay Sandbox</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyExternalUrl(pendingAuthUrl);
                  if (ok) {
                    setCopiedItem('auth_url_banner');
                    setTimeout(() => setCopiedItem(null), 3000);
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
                title="Copia link negli appunti"
              >
                {copiedItem === 'auth_url_banner' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copia Link</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <div className="font-semibold text-red-300">Avviso Operazione</div>
              <div className="text-slate-300 mt-0.5">{actionError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="px-3.5 py-2 bg-red-900/60 hover:bg-red-800/80 text-red-100 border border-red-700/60 rounded-lg font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isDiagnosing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wrench className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Risolvi con Diagnostica Automatica</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDA 1: FASE 3A - COLLEGAMENTO OAUTH & SICUREZZA ZERO-TRUST             */}
      {/* ========================================================================= */}
      {activeTab === 'oauth' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isConnected
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400'
                      : connectionInfo?.status === 'backend_not_configured'
                      ? 'bg-amber-950/40 border-amber-800/50 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                  ) : isConnected ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <Globe className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-100">
                      {isConnected ? 'Account eBay Sandbox Collegato' : 'Collega Account eBay Sandbox'}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isConnected
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {isConnected ? 'Attivo & Autorizzato' : 'Disconnesso'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {isConnected
                      ? `L'account eBay Sandbox '${connectionInfo?.ebayUsername || 'Autodemolitore'}' è regolarmente autorizzato con token di sicurezza cifrato AES-256-GCM. Puoi pubblicare inserzioni e ricevere ordini.`
                      : 'Autorizza Autopia Manager a sincronizzare annunci, giacenze magazzino e ordini con eBay Sandbox tramite il flusso sicuro OAuth 2.0.'}
                  </p>

                  {isConnected && connectionInfo?.tokenExpiresAt && (
                    <div className="pt-2 flex items-center space-x-3 text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Scadenza Sessione: {new Date(connectionInfo.tokenExpiresAt).toLocaleDateString('it-IT')} {new Date(connectionInfo.tokenExpiresAt).toLocaleTimeString('it-IT')}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold">• Token refresh automatico abilitato</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pulsanti Azione */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isInitiating || isLoading}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isInitiating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generazione State CSRF...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Collega Account eBay (Sandbox)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-4 py-2 bg-slate-950 hover:bg-red-950/40 hover:text-red-300 text-slate-400 border border-slate-800 hover:border-red-800/50 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Disconnessione...</span>
                      </>
                    ) : (
                      <>
                        <Unplug className="w-3.5 h-3.5" />
                        <span>Scollega Account</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Box Sessione OAuth eBay Attiva */}
            {pendingAuthUrl && !isConnected && (
              <div className="mt-6 p-4 bg-amber-950/25 border border-amber-800/50 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-300 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Autorizzazione eBay Sandbox in corso</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
                      La sessione di accesso con eBay Sandbox è pronta. Accedi con il tuo account sviluppatore eBay e clicca su <strong>"Agree"</strong> per completare il collegamento.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAuthUrl(null)}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 cursor-pointer"
                    title="Annulla sessione"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await openExternalUrl(pendingAuthUrl);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Apri eBay Sandbox nel Browser</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyExternalUrl(pendingAuthUrl);
                      if (ok) {
                        setCopiedItem('auth_url_card');
                        setTimeout(() => setCopiedItem(null), 3000);
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
                  >
                    {copiedItem === 'auth_url_card' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Link Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copia Link di Accesso</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => loadStatus(true)}
                    disabled={isLoading}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium rounded-lg text-xs flex items-center space-x-1.5 border border-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Verifica Collegamento Ora</span>
                  </button>
                </div>

                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">URL di autorizzazione generato:</div>
                  <div className="mt-1 p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all flex items-center justify-between">
                    <span className="truncate mr-2">{pendingAuthUrl}</span>
                    <button
                      type="button"
                      onClick={() => {
                        copyExternalUrl(pendingAuthUrl);
                        setCopiedItem('auth_url_card');
                        setTimeout(() => setCopiedItem(null), 3000);
                      }}
                      className="text-amber-400 hover:underline text-[10px] shrink-0 font-sans cursor-pointer"
                    >
                      {copiedItem === 'auth_url_card' ? 'Copiato' : 'Copia'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dettagli Tecnico-Architetturali */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero-Trust Architecture: Segreti eBay gestiti esclusivamente su Netlify Functions</span>
              </div>
              <button
                type="button"
                onClick={() => setShowArchitectureDetails(!showArchitectureDetails)}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                {showArchitectureDetails ? 'Nascondi Dettagli' : 'Mostra Configurazione Endpoint'}
              </button>
            </div>

            {showArchitectureDetails && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Endpoint Backend:</span>
                    <code className="text-amber-300 font-mono">{backendUrl}</code>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RuName eBay:</span>
                    <code className="text-slate-300 font-mono">Configurato su developer.ebay.com (Sandbox)</code>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cifratura Token:</span>
                    <span className="text-emerald-400 font-mono">AES-256-GCM (AuthTag 128-bit)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Permessi Richiesti:</span>
                    <span className="text-slate-300 font-mono">sell.inventory, sell.account, sell.fulfillment</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDA 2: FASE 3B - ANNUNCI & GIACENZE EBAY (Sell Inventory API)          */}
      {/* ========================================================================= */}
      {activeTab === 'listings' && (
        <div className="space-y-6">
          {/* Sezione Pubblicazione Rapida dal Magazzino */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Pubblica Ricambio da Magazzino su eBay Sandbox
                  </h2>
                  <p className="text-xs text-slate-400">
                    Seleziona un articolo dalla tua disponibilità reale in magazzino per generare l'annuncio con offerta a prezzo fisso.
                  </p>
                </div>
              </div>

              {selectedInventoryItem && (
                <button
                  type="button"
                  onClick={() => setSelectedInventoryItem(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Annulla selezione
                </button>
              )}
            </div>

            {/* Form di pubblicazione se un articolo è selezionato */}
            {selectedInventoryItem ? (
              <form onSubmit={handlePublish} className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-4">
                <div className="text-xs font-semibold text-amber-400 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Configurazione Inserzione per: {selectedInventoryItem.title}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Titolo Annuncio eBay (max 80 car.):</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={publishForm.title}
                      onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Prezzo di Vendita (€):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={publishForm.price}
                      onChange={(e) => setPublishForm({ ...publishForm, price: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Quantità Disponibile:</label>
                    <input
                      type="number"
                      min="1"
                      value={publishForm.quantity}
                      onChange={(e) => setPublishForm({ ...publishForm, quantity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Codice OEM: <span className="text-slate-200 font-mono">{selectedInventoryItem.oem_code || 'Non specificato'}</span> • SKU Generato: <span className="text-amber-400 font-mono">{publishForm.sku}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Pubblicazione su eBay Sandbox...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Conferma e Pubblica Annuncio</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-400">
                  Ricambi disponibili a magazzino ({warehouseItems.length}):
                </div>
                {warehouseItems.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                    Nessun ricambio trovato in magazzino. Aggiungi ricambi nella sezione "Magazzino & Ricambi" per poterli pubblicare su eBay.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
                    {warehouseItems.slice(0, 8).map((item) => (
                      <div key={item.id} className="p-3 bg-slate-950/60 hover:bg-slate-950 flex items-center justify-between text-xs transition-colors">
                        <div>
                          <div className="font-semibold text-slate-200">{item.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-3 mt-0.5">
                            <span>Prezzo: <strong className="text-emerald-400">€{item.price?.toFixed(2) || '0.00'}</strong></span>
                            <span>Giacenza: <strong className="text-amber-400">{item.quantity} pz</strong></span>
                            {item.oem_code && <span>OEM: <code className="text-slate-300 font-mono">{item.oem_code}</code></span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setPublishForm({
                              title: item.title,
                              price: item.price ? item.price.toString() : '25.00',
                              quantity: item.quantity ? item.quantity.toString() : '1',
                              sku: `AUT-${item.id.slice(0, 8).toUpperCase()}`,
                            });
                          }}
                          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Prepara Annuncio</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Elenco Inserzioni Pubblicate su eBay */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Inserzioni eBay Attive & Sincronizzazione Giacenze
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {listings.length} Inserzioni registrate
              </span>
            </div>

            {listings.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <Store className="w-8 h-8 mx-auto text-slate-600" />
                <div className="text-xs text-slate-400">
                  Nessun annuncio pubblicato su eBay per questo account demolitore.
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Usa il riquadro sopra per selezionare un ricambio dal magazzino Autopia e pubblicarlo sul marketplace eBay Sandbox.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">SKU / Item ID</th>
                      <th className="py-2.5 px-3">Titolo Inserzione</th>
                      <th className="py-2.5 px-3">Prezzo</th>
                      <th className="py-2.5 px-3">Giacenza eBay</th>
                      <th className="py-2.5 px-3">Stato</th>
                      <th className="py-2.5 px-3 text-right">Azione Rapida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {listings.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                          <div>{l.sku}</div>
                          {l.ebay_item_id && (
                            <div className="text-[10px] text-slate-500">ID: {l.ebay_item_id}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-200 max-w-xs truncate">
                          {l.title}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          €{l.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-mono font-bold ${l.quantity > 0 ? 'text-slate-200' : 'text-red-400'}`}>
                            {l.quantity} pz
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              l.status === 'published'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                : l.status === 'out_of_stock'
                                ? 'bg-red-950 text-red-300 border border-red-800/80'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleSyncQuantity(l, l.quantity + 1)}
                              disabled={updatingSku === l.sku}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="Aumenta di 1 pezzo"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSyncQuantity(l, Math.max(0, l.quantity - 1))}
                              disabled={updatingSku === l.sku}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="Diminuisci di 1 pezzo"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSyncQuantity(l, 0)}
                              disabled={updatingSku === l.sku}
                              className="px-2 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="Azzera giacenza su eBay"
                            >
                              Scarica
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDA 3: FASE 3C - ORDINI EBAY & EVASIONE (Sell Fulfillment API)        */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <span>Ricezione Ordini eBay Sandbox & Scarico Magazzino</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scarica gli ordini confermati su eBay Sandbox. Lo scarico scala automaticamente la disponibilità in magazzino per prevenire doppie vendite.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncOrders}
                disabled={isSyncingOrders}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSyncingOrders ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Download Ordini da eBay...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sincronizza Ordini eBay Sandbox</span>
                  </>
                )}
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
                <div className="text-xs text-slate-400">
                  Nessun ordine eBay registrato localmente.
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Clicca su "Sincronizza Ordini eBay Sandbox" per interrogare l'API Fulfillment di eBay e importare le vendite effettuate con il tuo account di test.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const form = trackingForms[order.id] || { tracking: '', carrier: 'BRT Corriere Espresso' };

                  return (
                    <div
                      key={order.id}
                      className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-400 text-xs">
                            Ordine #{order.ebay_order_id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              order.order_status === 'SHIPPED'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800/80'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                            }`}
                          >
                            {order.order_status === 'SHIPPED' ? 'Spedito' : 'Pagato • Da Spedire'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400">
                          Data: <span className="text-slate-200">{new Date(order.creation_date).toLocaleDateString('it-IT')}</span> • Totale: <strong className="text-emerald-400 font-mono text-sm">€{order.total_price.toFixed(2)} {order.currency}</strong>
                        </div>
                      </div>

                      {/* Dettagli Acquirente e Spedizione */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60 space-y-1">
                          <div className="text-slate-400 text-[11px] font-semibold flex items-center space-x-1">
                            <Truck className="w-3.5 h-3.5 text-blue-400" />
                            <span>Indirizzo di Spedizione:</span>
                          </div>
                          <div className="font-bold text-slate-100">{order.buyer_name} ({order.buyer_username})</div>
                          <div className="text-slate-400 text-[11px]">
                            {order.shipping_address?.addressLine1 || 'Indirizzo registrato su eBay'}, {order.shipping_address?.postalCode} {order.shipping_address?.city} ({order.shipping_address?.countryCode || 'IT'})
                          </div>
                        </div>

                        {/* Articoli nel Carrello */}
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60 space-y-1">
                          <div className="text-slate-400 text-[11px] font-semibold">Articoli Venduti:</div>
                          <div className="divide-y divide-slate-800">
                            {order.line_items?.map((item, idx) => (
                              <div key={idx} className="py-1 flex items-center justify-between text-[11px]">
                                <span className="text-slate-200 font-medium truncate max-w-xs">{item.title}</span>
                                <span className="font-mono text-amber-400">{item.quantity} pz • €{item.lineItemCost}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Modulo Evasione con Tracking */}
                      {order.order_status !== 'SHIPPED' ? (
                        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex flex-col sm:flex-row items-center gap-3">
                          <div className="text-xs text-amber-300 font-semibold shrink-0">
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
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
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
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                          />

                          <button
                            type="button"
                            onClick={() => handleFulfillOrder(order.id, order.ebay_order_id)}
                            disabled={fulfillingOrderId === order.id}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                          >
                            {fulfillingOrderId === order.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Invio...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Invia Tracking</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>Spedizione completata con <strong>{order.carrier_code || 'Corriere'}</strong> • Tracking: <code className="text-purple-300 font-mono">{order.tracking_number}</code></span>
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

      {/* Modale Diagnostica Completa Canale eBay */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Modale */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Diagnostica Canale eBay (Sandbox)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnosticsModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Chiudi
              </button>
            </div>

            {/* Contenuto Modale */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {isDiagnosing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-sm font-semibold text-slate-200">
                    Verifica architettura eBay in corso...
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Interrogazione del database Supabase, verifica sessione e test dell'endpoint Netlify.
                  </p>
                </div>
              ) : diagnosticsReport ? (
                <div className="space-y-4">
                  {/* Stato Globale */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      diagnosticsReport.allPassed
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {diagnosticsReport.allPassed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {diagnosticsReport.allPassed
                            ? 'Tutti i componenti sono allineati e pronti!'
                            : 'Punti di configurazione rilevati'}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {new Date(diagnosticsReport.timestamp).toLocaleTimeString()} — Verifica end-to-end
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunDiagnostics}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-400" />
                      <span>Riesegui</span>
                    </button>
                  </div>

                  {/* Lista Verifiche */}
                  <div className="space-y-2.5">
                    {diagnosticsReport.checks.map((check) => (
                      <div
                        key={check.id}
                        className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-xl space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            {check.status === 'ok' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            {check.status === 'warning' && (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            {check.status === 'error' && (
                              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-200 text-xs">
                              {check.name}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              check.status === 'ok'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : check.status === 'warning'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                                : 'bg-red-950 text-red-400 border border-red-800/50'
                            }`}
                          >
                            {check.status}
                          </span>
                        </div>

                        <p className="text-slate-300 text-xs pl-6">{check.message}</p>

                        {check.suggestion && (
                          <div className="ml-6 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-amber-200 flex items-start justify-between gap-2">
                            <span className="font-mono break-all">{check.suggestion}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(check.suggestion!, check.id)}
                              className="text-slate-400 hover:text-amber-300 shrink-0 cursor-pointer p-1"
                              title="Copia suggerimento"
                            >
                              {copiedItem === check.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Azioni Rapide Risoluzione */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Guida Rapida Configurazione
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>1. Schema SQL Supabase</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Crea le tabelle isolate <code className="text-amber-300">ebay_oauth_states</code> e <code className="text-amber-300">seller_ebay_tokens</code>.
                        </p>
                        <button
                          type="button"
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
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          {copiedItem === 'sql' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copiato negli Appunti!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copia SQL per Supabase</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          <span>2. Variabili Netlify</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Configura le variabili in <em>Site configuration &rarr; Environment variables</em>.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const envList = `SUPABASE_URL=https://ilcpmmgjkzrjyklqdpfl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
EBAY_SANDBOX_CLIENT_ID=YOUR_EBAY_SANDBOX_APP_ID
EBAY_SANDBOX_CLIENT_SECRET=YOUR_EBAY_SANDBOX_CERT_ID
EBAY_SANDBOX_RUNAME=YOUR_EBAY_SANDBOX_RUNAME
EBAY_TOKEN_ENCRYPTION_KEY=64_HEX_CHARACTERS_32_BYTES_KEY`;
                            copyToClipboard(envList, 'env');
                          }}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-blue-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          {copiedItem === 'env' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copiate negli Appunti!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copia Elenco Variabili Netlify</span>
                            </>
                          )}
                        </button>
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
