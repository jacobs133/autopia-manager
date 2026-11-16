import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchDashboardSnapshot,
  type DashboardSnapshot,
} from '../services/dashboardService';

interface DashboardContextValue {
  snapshot: DashboardSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refreshSnapshot: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  snapshot: null,
  isLoading: false,
  error: null,
  refreshSnapshot: async () => {},
});

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, sellerProfile, effectiveSellerProfile, isAdmin } = useAuth();
  const activeSeller = effectiveSellerProfile || sellerProfile;
  const isApproved = status === 'AUTHENTICATED_APPROVED';

  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSnapshot = useCallback(async () => {
    if (!isApproved || !activeSeller?.id) {
      setSnapshot(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardSnapshot(activeSeller.id, isAdmin);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setSnapshot(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento dati operativi');
    } finally {
      setIsLoading(false);
    }
  }, [isApproved, activeSeller?.id, isAdmin]);

  useEffect(() => {
    refreshSnapshot();
  }, [refreshSnapshot]);

  return (
    <DashboardContext.Provider value={{ snapshot, isLoading, error, refreshSnapshot }}>
      {children}
    </DashboardContext.Provider>
  );
};

export function useDashboard(): DashboardContextValue {
  return useContext(DashboardContext);
}
