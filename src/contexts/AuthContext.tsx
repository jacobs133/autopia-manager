import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import {
  getSupabaseClient,
  getSupabaseConfig,
  SupabaseConfig,
} from '../services/supabaseClient';

export type SellerProfile = Database['public']['Tables']['seller_profiles']['Row'];
export type AppRole = Database['public']['Enums']['app_role'];

export type AuthStateStatus =
  | 'INITIALIZING'
  | 'UNCONFIGURED'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED_APPROVED'
  | 'AUTHENTICATED_PENDING'
  | 'AUTHENTICATED_SUSPENDED'
  | 'AUTHENTICATED_REJECTED'
  | 'AUTHENTICATED_NO_SELLER'
  | 'NETWORK_ERROR';

import { ADMIN_EMAIL, isUserAdmin } from '../services/partsService';

export interface AuthContextType {
  status: AuthStateStatus;
  user: User | null;
  session: Session | null;
  sellerProfile: SellerProfile | null;
  effectiveSellerProfile: SellerProfile | null;
  userRoles: AppRole[];
  errorMessage: string | null;
  config: SupabaseConfig | null;
  isAdmin: boolean;
  adminSelectedSellerId: string | null;
  setAdminSelectedSellerId: (id: string | null) => void;
  availableSellers: SellerProfile[];
  refreshAvailableSellers: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStateStatus>('INITIALIZING');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<SupabaseConfig | null>(null);

  // Admin platform context
  const [adminSelectedSellerId, setAdminSelectedSellerId] = useState<string | null>(null);
  const [availableSellers, setAvailableSellers] = useState<SellerProfile[]>([]);

  const isAdmin = isUserAdmin(user?.email);

  const refreshAvailableSellers = useCallback(async (): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data } = await client
        .from('seller_profiles')
        .select('*')
        .order('business_name', { ascending: true });
      if (data && data.length > 0) {
        setAvailableSellers(data);
      }
    } catch (e) {
      console.warn('Errore lettura lista autodemolitori per admin:', e);
    }
  }, []);

  /**
   * Verifica l'identità dell'utente autenticato e ne recupera il profilo venditore.
   * Regola di integrità: Non crea MAI record fittizi; legge esclusivamente ciò che esiste nel backend.
   */
  const verifySellerAccess = useCallback(async (currentUser: User): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) {
      setStatus('UNCONFIGURED');
      return;
    }

    const isCurrentAdmin = isUserAdmin(currentUser.email);

    try {
      // 1. Lettura dei ruoli assegnati all'utente (se la policy RLS lo consente)
      let roles: AppRole[] = [];
      try {
        const { data: rolesData, error: rolesError } = await client
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);

        if (!rolesError && rolesData) {
          roles = rolesData.map((r) => r.role);
          setUserRoles(roles);
        }
      } catch (err) {
        console.warn('Nota: Impossibile leggere user_roles (possibile restrizione policy RLS):', err);
      }

      // Se admin, precarica tutti i profili venditore disponibili sulla piattaforma
      if (isCurrentAdmin) {
        await refreshAvailableSellers();
      }

      // 2. Recupero del record venditore da seller_profiles per user_id = auth.uid()
      const { data: sellerData, error: sellerError } = await client
        .from('seller_profiles')
        .select('*')
        .eq('user_id', currentUser.id);

      if (sellerError && !isCurrentAdmin) {
        console.error('Errore durante il recupero del profilo venditore:', sellerError);
        setStatus('NETWORK_ERROR');
        setErrorMessage(`Errore autorizzazione backend: ${sellerError.message}`);
        setSellerProfile(null);
        return;
      }

      // 3. Gestione caso nessun profilo venditore associato
      if (!sellerData || sellerData.length === 0) {
        if (isCurrentAdmin) {
          // L'account amministratore ha accesso privilegiato a tutta la piattaforma
          // Se non ha una propria autodemolizione registrata, recupera la prima disponibile per consentire la gestione
          const { data: allSellers } = await client
            .from('seller_profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (allSellers && allSellers.length > 0) {
            setSellerProfile(allSellers[0]);
            setAdminSelectedSellerId(allSellers[0].id);
          } else {
            setSellerProfile(null);
          }

          setStatus('AUTHENTICATED_APPROVED');
          setErrorMessage(null);
          return;
        }

        setStatus('AUTHENTICATED_NO_SELLER');
        setSellerProfile(null);
        setErrorMessage(
          'Questo account non risulta registrato come autodemolitore su Autopia (nessun seller_profile associato). Accedi con le credenziali del tuo account venditore registrato su autopiashop.it.'
        );
        return;
      }

      // 4. Se esistono record multipli (anomalia o sedi multiple), seleziona quello attivo
      const profile = sellerData[0];
      setSellerProfile(profile);

      // Se è admin, è sempre abilitato
      if (isCurrentAdmin) {
        setStatus('AUTHENTICATED_APPROVED');
        setErrorMessage(null);
        return;
      }

      // 5. Verifica dello stato di approvazione dell'autodemolitore standard
      switch (profile.status) {
        case 'approved':
          setStatus('AUTHENTICATED_APPROVED');
          setErrorMessage(null);
          break;
        case 'pending':
          setStatus('AUTHENTICATED_PENDING');
          setErrorMessage(
            `L'account per "${profile.business_name}" è in attesa di approvazione da parte dello staff di Autopia. L'accesso al gestionale sarà sbloccato non appena la tua azienda verrà approvata.`
          );
          break;
        case 'suspended':
          setStatus('AUTHENTICATED_SUSPENDED');
          setErrorMessage(
            `L'account per "${profile.business_name}" è stato temporaneamente sospeso. Contatta il supporto commerciale di Autopia per maggiori informazioni.`
          );
          break;
        case 'rejected':
          setStatus('AUTHENTICATED_REJECTED');
          setErrorMessage(
            `La richiesta venditore per "${profile.business_name}" è stata respinta. Contatta l'assistenza di Autopia.`
          );
          break;
        default:
          setStatus('AUTHENTICATED_PENDING');
          setErrorMessage(`Stato account non riconosciuto: ${profile.status}`);
          break;
      }
    } catch (err: unknown) {
      console.error('Eccezione durante la verifica venditore:', err);
      setStatus('NETWORK_ERROR');
      const msg = err instanceof Error ? err.message : 'Errore di comunicazione con il backend di Autopia';
      setErrorMessage(msg);
    }
  }, [refreshAvailableSellers]);

  /**
   * Inizializzazione o ricaricamento completo dello stato di autenticazione.
   */
  const refreshAuth = useCallback(async () => {
    const currentCfg = getSupabaseConfig();
    setConfig(currentCfg);

    if (!currentCfg) {
      setStatus('UNCONFIGURED');
      setUser(null);
      setSession(null);
      setSellerProfile(null);
      setUserRoles([]);
      setErrorMessage('Parametri di connessione Supabase non configurati nel client desktop');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setStatus('UNCONFIGURED');
      return;
    }

    try {
      const { data: { session: existingSession }, error } = await client.auth.getSession();
      if (error) {
        console.warn('Errore lettura sessione Supabase:', error);
        setStatus('UNAUTHENTICATED');
        setUser(null);
        setSession(null);
        return;
      }

      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        await verifySellerAccess(existingSession.user);
      } else {
        setStatus('UNAUTHENTICATED');
        setUser(null);
        setSession(null);
        setSellerProfile(null);
        setUserRoles([]);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error('Errore durante refreshAuth:', err);
      setStatus('NETWORK_ERROR');
      setErrorMessage('Errore di connessione al servizio di autenticazione');
    }
  }, [verifySellerAccess]);

  useEffect(() => {
    refreshAuth();

    const client = getSupabaseClient();
    if (!client) return;

    // Sottoscrizione pulita ai cambi di stato di Supabase Auth
    const { data: authListener } = client.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT' || !newSession?.user) {
        setUser(null);
        setSession(null);
        setSellerProfile(null);
        setUserRoles([]);
        setStatus('UNAUTHENTICATED');
        setErrorMessage(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession.user);
        await verifySellerAccess(newSession.user);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshAuth, verifySellerAccess]);

  /**
   * Esegue l'accesso tramite Supabase Auth con email e password.
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Configurazione Supabase non disponibile' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        let friendlyMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Credenziali non valide. Verifica email e password dell\'account Autopia.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage = 'Indirizzo email non ancora confermato. Controlla la tua casella di posta.';
        } else if (error.message.includes('Failed to fetch')) {
          friendlyMessage = 'Impossibile raggiungere il server. Verifica la connessione Internet.';
        }
        return { success: false, error: friendlyMessage };
      }

      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        await verifySellerAccess(data.user);
        return { success: true };
      }

      return { success: false, error: 'Risposta di autenticazione non valida' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Errore imprevisto durante il login' };
    }
  };

  /**
   * Esegue la disconnessione e pulisce lo stato locale.
   */
  const logout = async (): Promise<void> => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Errore durante il signOut remoto:', err);
      }
    }
    setUser(null);
    setSession(null);
    setSellerProfile(null);
    setUserRoles([]);
    setStatus('UNAUTHENTICATED');
    setErrorMessage(null);
  };

  // Determina il profilo venditore effettivo (se l'admin ha selezionato un autodemolitore specifico, usa quello)
  const effectiveSellerProfile: SellerProfile | null = (() => {
    if (isAdmin && adminSelectedSellerId) {
      const match = availableSellers.find((s) => s.id === adminSelectedSellerId);
      if (match) return match;
    }
    return sellerProfile;
  })();

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        session,
        sellerProfile,
        effectiveSellerProfile,
        userRoles,
        errorMessage,
        config,
        isAdmin,
        adminSelectedSellerId,
        setAdminSelectedSellerId,
        availableSellers,
        refreshAvailableSellers,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
  }
  return context;
};
