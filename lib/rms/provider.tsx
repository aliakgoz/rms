"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  type BrowserRmsStatus,
  createBrowserRmsFileStore
} from "@/lib/rms/browser-file-store";
import {
  addRequirement,
  addTableRecord,
  createInitialDatabase,
  normalizeDatabase,
  type GenericTableRecord,
  type RequirementRecord,
  type RmsDatabase,
  summarizeDatabase
} from "@/lib/rms/store";

type RmsContextValue = {
  db: RmsDatabase;
  status: BrowserRmsStatus;
  ready: boolean;
  connected: boolean;
  supportsFileSystemAccess: boolean;
  errorMessage?: string;
  connectFolder: () => Promise<void>;
  reconnectFolder: () => Promise<void>;
  refreshFromDisk: () => Promise<void>;
  createRequirementRecord: (input: Partial<RequirementRecord>) => Promise<RequirementRecord>;
  createGenericRecord: (tableName: string, input: Record<string, unknown>) => Promise<GenericTableRecord>;
};

const defaultStatus: BrowserRmsStatus = {
  syncState: "idle",
  fileName: "rms-data.json",
  hasStoredHandle: false,
  hasConnectedHandle: false,
  permission: "unsupported",
  externalChangeDetected: false,
  pendingLocalChanges: false
};

const RmsContext = createContext<RmsContextValue | null>(null);

function describeBrowserFileError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") {
      return undefined;
    }

    if (error.name === "SecurityError") {
      return "Tarayici bu sayfadan klasor secimine izin vermiyor. Dosyayi dogrudan masaustu Chrome veya Edge icinde index.html olarak acin ya da HTTPS altinda yayinlayin.";
    }

    if (error.name === "NotAllowedError") {
      return "Klasor erisimi engellendi. Sayfanin odakta oldugundan emin olun ve klasor secimini yeniden deneyin.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

export function RmsProvider({ children }: { children: React.ReactNode }) {
  const [fileStore] = useState(() => createBrowserRmsFileStore({ pollIntervalMs: 4000 }));
  const [db, setDb] = useState<RmsDatabase>(() => createInitialDatabase());
  const [status, setStatus] = useState<BrowserRmsStatus>(defaultStatus);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    const unsubscribeSnapshot = fileStore.onSnapshotChange((snapshot) => {
      startTransition(() => {
        setDb(normalizeDatabase(snapshot.document));
      });
    });

    const unsubscribeStatus = fileStore.onStatusChange((nextStatus) => {
      startTransition(() => {
        setStatus(nextStatus);
      });
    });

    let active = true;

    async function boot() {
      try {
        await fileStore.restoreSavedConnection();
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage(describeBrowserFileError(error) || "Yerel dosya baglantisi acilamadi.");
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void boot();

    return () => {
      active = false;
      unsubscribeSnapshot();
      unsubscribeStatus();
    };
  }, [fileStore]);

  useEffect(() => {
    if (!ready || !status.hasConnectedHandle) {
      return;
    }

    const stopWatching = fileStore.startWatching({ reloadOnChange: false });
    return () => {
      stopWatching();
    };
  }, [fileStore, ready, status.hasConnectedHandle]);

  async function connectFolder() {
    setErrorMessage(undefined);
    try {
      await fileStore.connectDirectory();
    } catch (error) {
      const message = describeBrowserFileError(error);
      setErrorMessage(message);
      throw error;
    }
  }

  async function reconnectFolder() {
    await connectFolder();
  }

  async function refreshFromDisk() {
    setErrorMessage(undefined);
    try {
      await fileStore.load();
    } catch (error) {
      const message = describeBrowserFileError(error) || "Yerel dosya yenilenemedi.";
      setErrorMessage(message);
      throw error;
    }
  }

  async function persist(nextDb: RmsDatabase) {
    if (status.externalChangeDetected) {
      const message = "Dosya uygulama disinda degismis gorunuyor. Yazmadan once yenileyin.";
      setErrorMessage(message);
      throw new Error(message);
    }

    await fileStore.save(nextDb);
    setErrorMessage(undefined);
  }

  async function createRequirementRecord(input: Partial<RequirementRecord>) {
    if (!status.hasConnectedHandle) {
      const message = "Once DivvySync klasorunu baglayin.";
      setErrorMessage(message);
      throw new Error(message);
    }

    const result = addRequirement(db, input);
    await persist(result.db);
    return result.requirement;
  }

  async function createGenericRecord(tableName: string, input: Record<string, unknown>) {
    if (!status.hasConnectedHandle) {
      const message = "Once DivvySync klasorunu baglayin.";
      setErrorMessage(message);
      throw new Error(message);
    }

    const result = addTableRecord(db, tableName, input);
    await persist(result.db);
    return result.record;
  }

  const value: RmsContextValue = {
    db,
    status,
    ready,
    connected: status.hasConnectedHandle,
    supportsFileSystemAccess: fileStore.isSupported(),
    errorMessage,
    connectFolder,
    reconnectFolder,
    refreshFromDisk,
    createRequirementRecord,
    createGenericRecord
  };

  return <RmsContext.Provider value={value}>{children}</RmsContext.Provider>;
}

export function useRmsData() {
  const context = useContext(RmsContext);
  if (!context) {
    throw new Error("useRmsData must be used inside RmsProvider.");
  }
  return context;
}

export function useRmsSummary() {
  const { db } = useRmsData();
  return useMemo(() => summarizeDatabase(db), [db]);
}

export function formatRmsTimestamp(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function describeSyncState(status: BrowserRmsStatus) {
  switch (status.syncState) {
    case "connected":
      return "connected";
    case "watching":
      return "watching";
    case "saving":
      return "saving";
    case "loading":
      return "loading";
    case "connecting":
      return "connecting";
    case "external-change":
      return "external change detected";
    case "permission-required":
      return "permission required";
    case "error":
      return "error";
    case "unavailable":
      return "unsupported browser";
    default:
      return "offline";
  }
}

export function describeConnectionTone(status: BrowserRmsStatus) {
  if (status.syncState === "error" || status.syncState === "permission-required") {
    return "error" as const;
  }

  if (status.externalChangeDetected || status.syncState === "external-change") {
    return "warning" as const;
  }

  if (status.pendingLocalChanges || status.syncState === "saving" || status.syncState === "loading") {
    return "pending" as const;
  }

  if (status.hasConnectedHandle) {
    return "connected" as const;
  }

  return "offline" as const;
}

export function buildSyncAlerts(status: BrowserRmsStatus, errorMessage?: string) {
  const alerts: string[] = [];

  const primaryError = errorMessage || status.error;
  if (primaryError) {
    alerts.push(primaryError);
  }

  if (status.externalChangeDetected) {
    alerts.push("Dosya DivvySync veya baska bir uygulama tarafindan degismis olabilir. Yenile ile tekrar yukleyin.");
  }

  if (status.permission === "prompt" || status.permission === "denied") {
    alerts.push("Tarayici kayitli klasore tekrar izin istemek zorunda kaldi. Gerekirse yeniden baglayin.");
  }

  if (status.syncState === "unavailable") {
    alerts.push("File System Access API icin masaustu Chrome veya Edge gerekir. Dosyayi bulut onizleme penceresinde degil, dogrudan tarayicida acin.");
  }

  if (status.hasConnectedHandle) {
    alerts.push("DivvySync gercek sync zamanini tarayiciya acmaz; son gozlenen dosya degisimi gosteriliyor.");
  }

  return [...new Set(alerts.filter(Boolean))];
}

export function formatLagLabel(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "Unknown";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "Less than a minute ago";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}
