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
  type BrowserTaskStatus,
  createBrowserTaskFileStore
} from "@/lib/tasks/browser-task-file-store";
import {
  addComment,
  createInitialDatabase,
  createTask,
  normalizeDatabase,
  summarizeDatabase,
  updateTask,
  type AddTaskCommentInput,
  type CreateTaskInput,
  type TaskComment,
  type TaskDatabase,
  type TaskRecord,
  type UpdateTaskInput
} from "@/lib/tasks/store";

type TaskContextValue = {
  db: TaskDatabase;
  status: BrowserTaskStatus;
  ready: boolean;
  connected: boolean;
  supportsFileSystemAccess: boolean;
  errorMessage?: string;
  connectFolder: () => Promise<void>;
  reconnectFolder: () => Promise<void>;
  refreshFromDisk: () => Promise<void>;
  createTaskRecord: (input: CreateTaskInput) => Promise<TaskRecord>;
  updateTaskRecord: (taskId: string, input: UpdateTaskInput) => Promise<TaskRecord>;
  addTaskCommentRecord: (input: AddTaskCommentInput) => Promise<TaskComment>;
};

const defaultStatus: BrowserTaskStatus = {
  syncState: "idle",
  fileName: "task-tracker-data.json",
  hasStoredHandle: false,
  hasConnectedHandle: false,
  permission: "unsupported",
  externalChangeDetected: false,
  pendingLocalChanges: false
};

const TaskContext = createContext<TaskContextValue | null>(null);

function describeBrowserFileError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") {
      return undefined;
    }

    if (error.name === "SecurityError") {
      return "Tarayici klasor secimine izin vermiyor. Dosyayi dogrudan masaustu Chrome veya Edge icinde index.html olarak acin ya da HTTPS altinda yayinlayin.";
    }

    if (error.name === "NotAllowedError") {
      return "Klasor erisimi engellendi. Sayfanin odakta oldugundan emin olun ve tekrar deneyin.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [fileStore] = useState(() => createBrowserTaskFileStore({ pollIntervalMs: 4000 }));
  const [db, setDb] = useState<TaskDatabase>(() => createInitialDatabase());
  const [status, setStatus] = useState<BrowserTaskStatus>(defaultStatus);
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

        setErrorMessage(describeBrowserFileError(error) || "Task database could not be opened.");
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
      setErrorMessage(describeBrowserFileError(error));
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
      setErrorMessage(describeBrowserFileError(error) || "Task database could not be refreshed.");
      throw error;
    }
  }

  async function persist(nextDb: TaskDatabase) {
    if (status.externalChangeDetected) {
      const message = "Task file changed outside this browser. Refresh before saving new edits.";
      setErrorMessage(message);
      throw new Error(message);
    }

    await fileStore.save(nextDb);
    setErrorMessage(undefined);
  }

  async function createTaskRecord(input: CreateTaskInput) {
    if (!status.hasConnectedHandle) {
      const message = "Task folder must be connected first.";
      setErrorMessage(message);
      throw new Error(message);
    }

    const result = createTask(db, input);
    await persist(result.db);
    return result.task;
  }

  async function updateTaskRecord(taskId: string, input: UpdateTaskInput) {
    if (!status.hasConnectedHandle) {
      const message = "Task folder must be connected first.";
      setErrorMessage(message);
      throw new Error(message);
    }

    const result = updateTask(db, taskId, input);
    await persist(result.db);
    return result.task;
  }

  async function addTaskCommentRecord(input: AddTaskCommentInput) {
    if (!status.hasConnectedHandle) {
      const message = "Task folder must be connected first.";
      setErrorMessage(message);
      throw new Error(message);
    }

    const result = addComment(db, input);
    await persist(result.db);
    return result.comment;
  }

  const value: TaskContextValue = {
    db,
    status,
    ready,
    connected: status.hasConnectedHandle,
    supportsFileSystemAccess: fileStore.isSupported(),
    errorMessage,
    connectFolder,
    reconnectFolder,
    refreshFromDisk,
    createTaskRecord,
    updateTaskRecord,
    addTaskCommentRecord
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskData() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskData must be used inside TaskProvider.");
  }
  return context;
}

export function useTaskSummary() {
  const { db } = useTaskData();
  return useMemo(() => summarizeDatabase(db), [db]);
}

export function formatTaskTimestamp(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function describeTaskSyncState(status: BrowserTaskStatus) {
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

export function describeTaskConnectionTone(status: BrowserTaskStatus) {
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

export function buildTaskAlerts(status: BrowserTaskStatus, errorMessage?: string) {
  const alerts: string[] = [];
  const primaryError = errorMessage || status.error;

  if (primaryError) {
    alerts.push(primaryError);
  }

  if (status.externalChangeDetected) {
    alerts.push("Task file changed in DivvySync or another client. Refresh to load the latest version.");
  }

  if (status.permission === "prompt" || status.permission === "denied") {
    alerts.push("Browser permission for the saved task folder needs to be granted again.");
  }

  if (status.syncState === "unavailable") {
    alerts.push("Desktop Chrome or Edge is required for local task file access. Avoid opening the app inside a cloud preview frame.");
  }

  if (status.hasConnectedHandle) {
    alerts.push("DivvySync sync completion is not visible in the browser; this panel shows local file activity only.");
  }

  return [...new Set(alerts.filter(Boolean))];
}
