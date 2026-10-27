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
  isTauri: boolean;
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

  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    setIsChecking(true);
    setProgress((p) => ({ ...p, status: 'CHECKING', errorMessage: undefined }));

    try {
      const res = await checkForAppUpdate({ force: manual });

      if (res.updateAvailable && res.updateInfo) {
        setUpdateAvailable(true);
        setUpdateInfo(res.updateInfo);
        setIsDismissed(false);
        setProgress((p) => ({ ...p, status: 'AVAILABLE' }));
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
        setProgress((p) => ({
          ...p,
          status: res.error ? 'ERROR' : 'UP_TO_DATE',
          errorMessage: res.error || undefined,
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto durante il controllo aggiornamenti';
      setProgress((p) => ({ ...p, status: 'ERROR', errorMessage: msg }));
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Controllo automatico silenzioso all'avvio dell'applicazione
  useEffect(() => {
    // Breve ritardo all'avvio per non rallentare l'inizializzazione del database e dell'autenticazione
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 4000);

    // Controllo periodico ogni 4 ore
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

    const res = await downloadAndInstallAppUpdate(updateInfo.rawUpdate || null, (prog) => {
      setProgress(prog);
    });

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
  }, []);

  const resetUpdateState = useCallback(() => {
    setProgress({
      status: 'IDLE',
      percentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    });
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
        isTauri,
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
