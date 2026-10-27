import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Car,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth, SellerProfile } from '../../contexts/AuthContext';
import {
  ADMIN_EMAIL,
  isUserAdmin,
  fetchAllSellersForAdmin,
  adminReviewSeller,
  fetchAdminPlatformStats,
} from '../../services/partsService';
import type { SellerStatus } from '../../types/inventory';

export const AdminManager: React.FC = () => {
  const {
    user,
    isAdmin,
    adminSelectedSellerId,
    setAdminSelectedSellerId,
    refreshAvailableSellers,
  } = useAuth();

  // CONTROLLO DI SICUREZZA RIGOROSO:
  // Nessun account eccetto lollogamer2009@gmail.com può visualizzare o eseguire funzioni da questa schermata
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

  // Se l'utente non è lollogamer2009@gmail.com, blocca immediatamente qualsiasi visualizzazione
  if (!isStrictlyAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/80 rounded-2xl p-7 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Accesso Amministratore Riservato</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Questa sezione è riservata esclusivamente all'account master di sistema (
              <span className="text-slate-200 font-mono font-bold">{ADMIN_EMAIL}</span>).
              Il tuo indirizzo email non dispone dei privilegi di amministrazione della piattaforma.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-500 font-mono">
            IP & Access Logs registrati su Supabase Auth
          </div>
        </div>
      </div>
    );
  }

  // Filtraggio lista venditori
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-sans text-slate-100 overflow-y-auto">
      {/* 1. Header Admin Master */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>Console Amministrazione Autopia Master</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                Operatore: <strong className="text-purple-300">{ADMIN_EMAIL}</strong>
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center space-x-2">
              <span>Supervisione Autodemolitori & Piattaforma</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Approvazione accrediti piazzali, supervisione dei magazzini ricambi e gestione centralizzata.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => loadAdminData()}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              title="Ricarica statistiche e venditori"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                : 'bg-red-950/60 border border-red-800/80 text-red-300'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Schede KPI Piattaforma Globale */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-purple-400" />
              <span>Totale Autodemolitori</span>
            </div>
            <div className="text-xl font-bold text-slate-100 mt-1">{stats.totalSellers}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Piazzali Approvati</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats.approvedSellers}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>In Attesa Accredito</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">{stats.pendingSellers}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Package className="w-3 h-3 text-blue-400" />
              <span>Ricambi su Rete</span>
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1">{stats.totalInventories}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Car className="w-3 h-3 text-amber-400" />
              <span>Catalogo Centrale</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {stats.totalCatalogVehicles.toLocaleString('it-IT')}
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca autodemolitore per ragione sociale, P.IVA o città..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="all">Tutti gli stati venditore</option>
              <option value="pending">In attesa approvazione</option>
              <option value="approved">Approvati</option>
              <option value="suspended">Sospesi</option>
              <option value="rejected">Respinti</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Elenco Autodemolitori Piattaforma */}
      <div className="flex-1 p-6 space-y-4">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-xs">Caricamento registro venditori Autopia in corso...</p>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-2 bg-slate-900/40 rounded-xl border border-slate-800 border-dashed text-slate-400">
            <Building2 className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">Nessun autodemolitore trovato</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Ragione Sociale / Sede</th>
                  <th className="py-3 px-4">P.IVA / Fiscale</th>
                  <th className="py-3 px-4">Contatti</th>
                  <th className="py-3 px-4">Stato Account</th>
                  <th className="py-3 px-4">Data Iscrizione</th>
                  <th className="py-3 px-4 text-right">Azioni SuperAdmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSellers.map((s) => {
                  const isCurrentActiveContext = adminSelectedSellerId === s.id;
                  const isProcessing = actionInProgressId === s.id;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isCurrentActiveContext ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                          <span>{s.business_name}</span>
                          {isCurrentActiveContext && (
                            <span className="text-[9px] bg-purple-900 text-purple-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                              ATTIVO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.city} ({s.province || 'IT'}) • {s.address || 'Indirizzo non spec.'}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {s.vat_number || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        <div>{s.email || '—'}</div>
                        {s.phone && (
                          <div className="text-[10px] text-slate-400">{s.phone}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            s.status === 'approved'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              : s.status === 'pending'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                              : s.status === 'suspended'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('it-IT') : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Pulsante Switch Contesto */}
                          <button
                            type="button"
                            onClick={() => setAdminSelectedSellerId(s.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center space-x-1 ${
                              isCurrentActiveContext
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                            title="Seleziona come piazzale corrente per gestire veicoli e ricambi"
                          >
                            <span>{isCurrentActiveContext ? 'Selezionato' : 'Gestisci Piazzale'}</span>
                          </button>

                          {/* Pulsanti Approvazione / Sospensione */}
                          {s.status !== 'approved' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(s.id, 'approved')}
                              className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded text-[10px] font-bold transition-colors"
                              title="Approva accredito venditore"
                            >
                              Approva
                            </button>
                          )}

                          {s.status === 'approved' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(s.id, 'suspended')}
                              className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded text-[10px] font-bold transition-colors"
                              title="Sospendi temporaneamente account venditore"
                            >
                              Sospendi
                            </button>
                          )}

                          {s.status !== 'rejected' && s.status !== 'approved' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(s.id, 'rejected')}
                              className="px-2 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded text-[10px] font-bold transition-colors"
                              title="Rifiuta richiesta venditore"
                            >
                              Rifiuta
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Note Tecniche Amministrazione Riservata */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Politiche di Sicurezza Amministratore Autopia</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Tutte le azioni di revisione venditore modificano il record ufficiale in <code className="text-slate-300">seller_profiles.status</code> e sincronizzano istantaneamente l'accesso degli autodemolitori nelle loro installazioni desktop. In accordo con le direttive fornite, questa suite gestionale garantisce che solo ed esclusivamente l'account <code className="text-purple-300 font-bold">{ADMIN_EMAIL}</code> possa operare con privilegi master.
          </p>
        </div>
      </div>
    </div>
  );
};
