import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  checkForAppUpdate,
  downloadAndInstallAppUpdate,
  relaunchApp,
  isTauriEnvironment,
  getRuntimeAppVersion,
  AppUpdateInfo,
  UpdateProgress,
  APP_CURRENT_VERSION,
  getAutoCheckPreference,
  setAutoCheckPreference,
  getCheckIntervalHours,
  setCheckIntervalHours,
  getPostponedVersion,
  setPostponedVersion,
} from '../services/updaterService';

export interface UpdateContextType {
  isChecking: boolean;
  updateAvailable: boolean;
  currentVersion: string;
  updateInfo: AppUpdateInfo | null;
  progress: UpdateProgress;
  isDismissed: boolean;
  isModalOpen: boolean;
  isTauri: boolean;
  lastCheckSummary: string | null;
  autoCheckEnabled: boolean;
  checkIntervalHours: number;
  setAutoCheckEnabled: (enabled: boolean) => void;
  setCheckIntervalHoursPreference: (hours: number) => void;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  startInstall: () => Promise<void>;
  relaunch: () => Promise<void>;
  postponeUpdate: () => void;
  resetUpdateState: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVersion, setCurrentVersion] = useState<string>(APP_CURRENT_VERSION);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastCheckSummary, setLastCheckSummary] = useState<string | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabledState] = useState<boolean>(getAutoCheckPreference());
  const [checkIntervalHours, setCheckIntervalHoursState] = useState<number>(getCheckIntervalHours());

  const isTauri = isTauriEnvironment();

  useEffect(() => {
    getRuntimeAppVersion().then((v) => {
      if (v) setCurrentVersion(v);
    });
  }, []);

  const [progress, setProgress] = useState<UpdateProgress>({
    status: 'IDLE',
    percentage: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  });

  const openUpdateModal = useCallback(() => {
    setIsModalOpen(true);
    setIsDismissed(false);
  }, []);

  const closeUpdateModal = useCallback(() => {
    setIsModalOpen(false);
    // Non cancelliamo l'aggiornamento, lo nascondiamo solo temporaneamente
  }, []);

  const postponeUpdate = useCallback(() => {
    if (updateInfo?.version) {
      setPostponedVersion(updateInfo.version);
    }
    setIsDismissed(true);
    setIsModalOpen(false);
  }, [updateInfo]);

  const setAutoCheckEnabled = useCallback((enabled: boolean) => {
    setAutoCheckPreference(enabled);
    setAutoCheckEnabledState(enabled);
  }, []);

  const setCheckIntervalHoursPreference = useCallback((hours: number) => {
    setCheckIntervalHours(hours);
    setCheckIntervalHoursState(hours);
  }, []);

  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    setIsChecking(true);
    if (manual) {
      setIsModalOpen(true);
      setIsDismissed(false);
      setProgress((p) => ({ ...p, status: 'CHECKING', errorMessage: undefined }));
    }

    try {
      const res = await checkForAppUpdate({ force: manual });

      if (res.updateAvailable && res.updateInfo) {
        setUpdateAvailable(true);
        setUpdateInfo(res.updateInfo);

        const postponed = getPostponedVersion();
        const isPostponed = !manual && postponed === res.updateInfo.version;

        if (!isPostponed) {
          setIsDismissed(false);
          setIsModalOpen(true);
        } else {
          setIsDismissed(true);
        }

        setLastCheckSummary(`Nuova versione v${res.updateInfo.version} pronta per l'installazione.`);
        setProgress((p) => ({
          ...p,
          status: 'AVAILABLE',
          errorMessage: undefined,
          stepMessage: undefined,
        }));
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
        const summary = res.error
          ? res.error
          : `Autopia Manager è aggiornato alla versione più recente (v${currentVersion}).`;
        setLastCheckSummary(summary);
        setProgress((p) => ({
          ...p,
          status: res.error ? 'ERROR' : 'UP_TO_DATE',
          errorMessage: res.error || undefined,
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto durante la verifica';
      setLastCheckSummary(msg);
      setProgress((p) => ({ ...p, status: 'ERROR', errorMessage: msg }));
    } finally {
      setIsChecking(false);
    }
  }, [currentVersion]);

  // Controllo periodico in background all'avvio e ad intervalli regolari
  useEffect(() => {
    // Controllo iniziale a 3 secondi dall'avvio
    const initTimer = setTimeout(() => {
      checkForUpdates(false);
    }, 3000);

    // Controllo periodico ogni 30 minuti (verifica se è trascorso l'intervallo configurato)
    const intervalTimer = setInterval(() => {
      checkForUpdates(false);
    }, 30 * 60 * 1000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
    };
  }, [checkForUpdates]);

  // Avvio download e installazione in-app
  const startInstall = useCallback(async () => {
    if (!updateInfo) return;

    setIsModalOpen(true);
    setIsDismissed(false);

    setProgress({
      status: 'DOWNLOADING',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      stepMessage: 'Inizializzazione download...',
    });

    const res = await downloadAndInstallAppUpdate(
      updateInfo.rawUpdate || null,
      (prog) => {
        setProgress(prog);
      }
    );

    if (!res.success) {
      setProgress((p) => ({
        ...p,
        status: 'ERROR',
        errorMessage: res.error || 'Errore durante l\'aggiornamento.',
      }));
    } else {
      // Reset versione posticipata dato che l'aggiornamento è stato installato
      setPostponedVersion(null);
    }
  }, [updateInfo]);

  const relaunch = useCallback(async () => {
    await relaunchApp();
  }, []);

  const resetUpdateState = useCallback(() => {
    setProgress({
      status: 'IDLE',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    });
    setLastCheckSummary(null);
  }, []);

  return (
    <UpdateContext.Provider
      value={{
        isChecking,
        updateAvailable,
        currentVersion,
        updateInfo,
        progress,
        isDismissed,
        isModalOpen,
        isTauri,
        lastCheckSummary,
        autoCheckEnabled,
        checkIntervalHours,
        setAutoCheckEnabled,
        setCheckIntervalHoursPreference,
        openUpdateModal,
        closeUpdateModal,
        checkForUpdates,
        startInstall,
        relaunch,
        postponeUpdate,
        resetUpdateState,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdate = (): UpdateContextType => {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    throw new Error('useUpdate deve essere utilizzato all\'interno di un UpdateProvider');
  }
  return ctx;
};
