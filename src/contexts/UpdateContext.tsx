import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  checkForAppUpdate,
  downloadAndInstallAppUpdate,
  relaunchApp,
  isTauriEnvironment,
  getRuntimeAppVersion,
  AppUpdateInfo,
  UpdateProgress,
  UpdateInstallStatus,
  APP_CURRENT_VERSION,
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
    setIsDismissed(true);
  }, []);

  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    setIsChecking(true);
    if (manual) {
      setIsModalOpen(true);
      setIsDismissed(false);
    }
    setProgress((p) => ({ ...p, status: 'CHECKING', errorMessage: undefined }));

    try {
      const res = await checkForAppUpdate({ force: manual });

      if (res.updateAvailable && res.updateInfo) {
        setUpdateAvailable(true);
        setUpdateInfo(res.updateInfo);
        setIsDismissed(false);
        setIsModalOpen(true);
        setLastCheckSummary(`Nuova versione v${res.updateInfo.version} disponibile!`);
        setProgress((p) => ({ ...p, status: 'AVAILABLE' }));
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
        const summary = res.error
          ? `Verifica completata: ${res.error}`
          : `Autopia Manager è aggiornato alla versione più recente (v${currentVersion}).`;
        setLastCheckSummary(summary);
        setProgress((p) => ({
          ...p,
          status: res.error ? 'ERROR' : 'UP_TO_DATE',
          errorMessage: res.error || undefined,
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto durante il controllo';
      setLastCheckSummary(msg);
      setProgress((p) => ({ ...p, status: 'ERROR', errorMessage: msg }));
    } finally {
      setIsChecking(false);
    }
  }, [currentVersion]);

  // Controllo automatico silenzioso all'avvio dell'applicazione
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 4000);

    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 4 * 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const startInstall = useCallback(async () => {
    if (!updateInfo) return;

    setProgress({
      status: 'DOWNLOADING',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    });

    const res = await downloadAndInstallAppUpdate(
      updateInfo.rawUpdate || null,
      (prog) => {
        setProgress(prog);
      },
      updateInfo.downloadUrl
    );

    if (!res.success) {
      setProgress((p) => ({
        ...p,
        status: 'ERROR',
        errorMessage: res.error || 'Errore installazione',
      }));
    }
  }, [updateInfo]);

  const relaunch = useCallback(async () => {
    await relaunchApp();
  }, []);

  const postponeUpdate = useCallback(() => {
    setIsDismissed(true);
    setIsModalOpen(false);
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
