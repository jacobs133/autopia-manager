import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Car,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
} from 'lucide-react';
import { useAuth, SellerProfile } from '../../contexts/AuthContext';
import {
  ADMIN_EMAIL,
  fetchAllSellersForAdmin,
  adminReviewSeller,
  fetchAdminPlatformStats,
} from '../../services/partsService';
import type { SellerStatus } from '../../types/inventory';
import {
  uiClasses,
  Button,
  KpiCard,
  StatusBadge,
  AlertBanner,
  LoadingState,
  EmptyState,
  type BadgeTone,
} from '../ui/DesignSystem';

export const AdminManager: React.FC = () => {
  const {
    user,
    isAdmin,
    adminSelectedSellerId,
    setAdminSelectedSellerId,
    refreshAvailableSellers,
  } = useAuth();

  // CONTROLLO DI SICUREZZA RIGOROSO
  const isStrictlyAuthorized =
    isAdmin &&
    user?.email &&
    user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [stats, setStats] = useState<{
    totalSellers: number;
    approvedSellers: number;
    pendingSellers: number;
    totalInventories: number;
    totalCatalogVehicles: number;
  }>({
    totalSellers: 0,
    approvedSellers: 0,
    pendingSellers: 0,
    totalInventories: 0,
    totalCatalogVehicles: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadAdminData = useCallback(async () => {
    if (!isStrictlyAuthorized) return;
    setIsLoading(true);
    setFeedbackMessage(null);

    try {
      const [sellersRes, statsRes] = await Promise.all([
        fetchAllSellersForAdmin(user?.email),
        fetchAdminPlatformStats(user?.email),
      ]);

      if (sellersRes.error) {
        setFeedbackMessage({ type: 'error', text: sellersRes.error });
      } else {
        setSellers(sellersRes.data);
      }

      if (!statsRes.error) {
        setStats({
          totalSellers: statsRes.totalSellers,
          approvedSellers: statsRes.approvedSellers,
          pendingSellers: statsRes.pendingSellers,
          totalInventories: statsRes.totalInventories,
          totalCatalogVehicles: statsRes.totalCatalogVehicles,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore caricamento dati admin';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  }, [isStrictlyAuthorized, user?.email]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleUpdateStatus = async (sellerId: string, newStatus: SellerStatus) => {
    if (!isStrictlyAuthorized) return;
    setActionInProgressId(sellerId);
    setFeedbackMessage(null);

    const res = await adminReviewSeller(user?.email, sellerId, newStatus);
    setActionInProgressId(null);

    if (res.error) {
      setFeedbackMessage({ type: 'error', text: res.error });
    } else {
      setFeedbackMessage({
        type: 'success',
        text: `Stato venditore aggiornato a "${newStatus.toUpperCase()}" con successo.`,
      });
      loadAdminData();
      refreshAvailableSellers();
    }
  };

  if (!isStrictlyAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F5F7F7] font-sans text-[#1A2322]">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-7 text-center space-y-4 shadow-sm">
          <div className="w-13 h-13 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#162220]">Accesso Amministratore Riservato</h2>
            <p className="text-xs text-[#5C6B68] mt-2 leading-relaxed">
              Questa sezione è riservata esclusivamente all'account master di sistema (
              <span className="text-[#074E44] font-mono font-bold">{ADMIN_EMAIL}</span>). Il tuo
              indirizzo email non dispone dei privilegi di amministrazione.
            </p>
          </div>
          <div className="p-3 bg-[#FAFBFB] rounded-lg border border-[#E2E8E7] text-[11px] text-[#5C6B68] font-mono">
            Accesso controllato da Supabase Auth
          </div>
        </div>
      </div>
    );
  }

  const filteredSellers = sellers.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const term = search.toLowerCase().trim();
    const matchSearch =
      !term ||
      s.business_name.toLowerCase().includes(term) ||
      (s.vat_number && s.vat_number.toLowerCase().includes(term)) ||
      (s.city && s.city.toLowerCase().includes(term));
    return matchStatus && matchSearch;
  });

  const getSellerBadgeTone = (status: string): BadgeTone => {
    if (status === 'approved') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'suspended') return 'danger';
    return 'neutral';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7F7] font-sans text-[#1A2322] overflow-y-auto">
      {/* Header Admin Master */}
      <div className="px-6 py-5 bg-white border-b border-[#E2E8E7] space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C6B68]">
              <StatusBadge tone="brand">
                <ShieldAlert className="w-3 h-3" />
                <span>Amministrazione Master</span>
              </StatusBadge>
              <span className="font-mono">
                Operatore: <strong className="text-[#074E44]">{ADMIN_EMAIL}</strong>
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#162220] mt-1">
              Supervisione Autodemolitori & Piattaforma
            </h1>
            <p className="text-xs text-[#5C6B68] mt-0.5">
              Approvazione accrediti piazzali, supervisione dei magazzini ricambi e gestione centralizzata.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadAdminData()}
            disabled={isLoading}
            title="Ricarica statistiche e venditori"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#074E44]' : ''}`} />
            <span>Aggiorna</span>
          </Button>
        </div>

        {feedbackMessage && (
          <AlertBanner
            tone={feedbackMessage.type === 'success' ? 'success' : 'danger'}
            onDismiss={() => setFeedbackMessage(null)}
          >
            {feedbackMessage.text}
          </AlertBanner>
        )}

        {/* Schede KPI Piattaforma */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            label="Totale autodemolitori"
            value={stats.totalSellers}
            icon={<Building2 className="w-4 h-4" />}
          />
          <KpiCard
            label="Piazzali approvati"
            value={stats.approvedSellers}
            icon={<CheckCircle2 className="w-4 h-4" />}
            accent="success"
          />
          <KpiCard
            label="In attesa accredito"
            value={stats.pendingSellers}
            icon={<AlertTriangle className="w-4 h-4" />}
            accent={stats.pendingSellers > 0 ? 'warning' : 'default'}
          />
          <KpiCard
            label="Ricambi su rete"
            value={stats.totalInventories.toLocaleString('it-IT')}
            icon={<Package className="w-4 h-4" />}
            accent="brand"
          />
          <KpiCard
            label="Catalogo centrale"
            value={stats.totalCatalogVehicles.toLocaleString('it-IT')}
            icon={<Car className="w-4 h-4" />}
          />
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8A9895]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca autodemolitore per ragione sociale, P.IVA o città..."
              className={`${uiClasses.input} pl-8`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={uiClasses.select}
          >
            <option value="all">Tutti gli stati venditore</option>
            <option value="pending">In attesa approvazione</option>
            <option value="approved">Approvati</option>
            <option value="suspended">Sospesi</option>
            <option value="rejected">Respinti</option>
          </select>
        </div>
      </div>

      {/* Elenco Autodemolitori */}
      <div className="flex-1 p-6 space-y-4">
        {isLoading ? (
          <LoadingState message="Caricamento registro venditori Autopia in corso..." />
        ) : filteredSellers.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-6 h-6" />}
            title="Nessun autodemolitore trovato"
            description="Nessun profilo corrisponde ai filtri di ricerca impostati."
          />
        ) : (
          <div className={uiClasses.tableWrapper}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={uiClasses.tableHeadRow}>
                    <th className="py-3 px-4">Ragione Sociale / Sede</th>
                    <th className="py-3 px-4">P.IVA / Fiscale</th>
                    <th className="py-3 px-4">Contatti</th>
                    <th className="py-3 px-4">Stato Account</th>
                    <th className="py-3 px-4">Data Iscrizione</th>
                    <th className="py-3 px-4 text-right">Azioni Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F1]">
                  {filteredSellers.map((s) => {
                    const isCurrentActiveContext = adminSelectedSellerId === s.id;
                    const isProcessing = actionInProgressId === s.id;

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-[#F7FAF9] transition-colors ${
                          isCurrentActiveContext ? 'bg-[#EAF3F1]/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1A2322] flex items-center gap-2">
                            <span>{s.business_name}</span>
                            {isCurrentActiveContext && (
                              <StatusBadge tone="brand">ATTIVO</StatusBadge>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5C6B68] mt-0.5">
                            {s.city} ({s.province || 'IT'}) • {s.address || 'Indirizzo non spec.'}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[#3F4E4B]">
                          {s.vat_number || '—'}
                        </td>

                        <td className="py-3 px-4 text-[#3F4E4B]">
                          <div>{s.email || '—'}</div>
                          {s.phone && (
                            <div className="text-[11px] text-[#5C6B68] font-mono">{s.phone}</div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <StatusBadge tone={getSellerBadgeTone(s.status)}>
                            {s.status.toUpperCase()}
                          </StatusBadge>
                        </td>

                        <td className="py-3 px-4 text-[#5C6B68] text-[11px] tabular-nums">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('it-IT') : '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={isCurrentActiveContext ? 'primary' : 'secondary'}
                              size="xs"
                              onClick={() => setAdminSelectedSellerId(s.id)}
                              title="Seleziona come piazzale corrente per gestire veicoli e ricambi"
                            >
                              {isCurrentActiveContext ? 'Selezionato' : 'Gestisci Piazzale'}
                            </Button>

                            {s.status !== 'approved' && (
                              <Button
                                variant="success"
                                size="xs"
                                disabled={isProcessing}
                                onClick={() => handleUpdateStatus(s.id, 'approved')}
                                title="Approva accredito venditore"
                              >
                                Approva
                              </Button>
                            )}

                            {s.status === 'approved' && (
                              <Button
                                variant="secondary"
                                size="xs"
                                disabled={isProcessing}
                                onClick={() => handleUpdateStatus(s.id, 'suspended')}
                                className="text-amber-800 border-amber-200 hover:bg-amber-50"
                                title="Sospendi temporaneamente account venditore"
                              >
                                Sospendi
                              </Button>
                            )}

                            {s.status !== 'rejected' && s.status !== 'approved' && (
                              <Button
                                variant="secondary"
                                size="xs"
                                disabled={isProcessing}
                                onClick={() => handleUpdateStatus(s.id, 'rejected')}
                                className="text-red-700 border-red-200 hover:bg-red-50"
                                title="Rifiuta richiesta venditore"
                              >
                                Rifiuta
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Note Sicurezza */}
        <div className={`${uiClasses.card} p-4 text-xs text-[#5C6B68] space-y-1.5`}>
          <div className="font-bold text-[#162220] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#074E44]" />
            <span>Politiche di Sicurezza Amministratore Autopia</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Tutte le azioni di revisione venditore aggiornano lo stato ufficiale dell'account su
            Supabase e sincronizzano l'accesso delle installazioni desktop. Solo l'account{' '}
            <code className="text-[#074E44] font-semibold">{ADMIN_EMAIL}</code> può operare con
            privilegi master.
          </p>
        </div>
      </div>
    </div>
  );
};
