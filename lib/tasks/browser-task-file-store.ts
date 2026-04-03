import type { TaskDatabase } from "./store";
import { createInitialDatabase, normalizeDatabase, TASKS_FILE_NAME } from "./store";

const DEFAULT_FILE_NAME = TASKS_FILE_NAME;
const DEFAULT_IDB_NAME = "task-browser-file-store";
const DEFAULT_IDB_STORE = "handles";
const DEFAULT_IDB_KEY = "default";

export type BrowserTaskPermissionState = PermissionState | "unsupported";
export type BrowserTaskSyncState =
  | "unavailable"
  | "idle"
  | "connecting"
  | "connected"
  | "loading"
  | "saving"
  | "watching"
  | "external-change"
  | "permission-required"
  | "error";

export type BrowserTaskStatus = {
  syncState: BrowserTaskSyncState;
  fileName: string;
  directoryName?: string;
  lastBoundAt?: string;
  hasStoredHandle: boolean;
  hasConnectedHandle: boolean;
  permission: BrowserTaskPermissionState;
  lastLoadedAt?: string;
  lastSavedAt?: string;
  lastObservedFileModifiedAt?: string;
  lastExternalChangeAt?: string;
  fileSize?: number;
  externalChangeDetected: boolean;
  pendingLocalChanges: boolean;
  error?: string;
};

export type BrowserTaskSnapshot = {
  document: TaskDatabase;
  status: BrowserTaskStatus;
};

export type BrowserTaskStoreOptions = {
  fileName?: string;
  indexedDbName?: string;
  indexedDbStore?: string;
  indexedDbKey?: string;
  pollIntervalMs?: number;
};

type BrowserPermissionMode = "read" | "readwrite";

type BrowserDirectoryPickerOptions = {
  mode?: BrowserPermissionMode;
};

type BrowserFileSystemHandle = FileSystemHandle & {
  queryPermission?: (descriptor: { mode: BrowserPermissionMode }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: BrowserPermissionMode }) => Promise<PermissionState>;
};

type StoredTaskHandles = {
  directoryHandle?: FileSystemDirectoryHandle;
  fileHandle?: FileSystemFileHandle;
  fileName: string;
  connectedAt: string;
  lastRestoredAt?: string;
};

type StatusListener = (status: BrowserTaskStatus) => void;
type SnapshotListener = (snapshot: BrowserTaskSnapshot) => void;

function nowIso() {
  return new Date().toISOString();
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isBrowserFileSystemAvailable() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && "indexedDB" in window;
}

async function writeJsonFile(fileHandle: FileSystemFileHandle, value: unknown) {
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(value, null, 2));
  await writable.close();
}

async function openIndexedDb(name: string, storeName: string) {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available.");
  }

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName);
      }
    };

    request.onerror = () => reject(request.error || new Error("IndexedDB open failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbGet<T>(name: string, storeName: string, key: string): Promise<T | undefined> {
  const database = await openIndexedDb(name, storeName);

  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error || new Error("IndexedDB read failed."));
      request.onsuccess = () => resolve(request.result as T | undefined);
    });
  } finally {
    database.close();
  }
}

async function idbSet(name: string, storeName: string, key: string, value: unknown) {
  const database = await openIndexedDb(name, storeName);

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error || new Error("IndexedDB write failed."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    });
  } finally {
    database.close();
  }
}

async function queryPermission(
  handle: FileSystemDirectoryHandle | FileSystemFileHandle,
  mode: BrowserPermissionMode
): Promise<PermissionState | "unsupported"> {
  const browserHandle = handle as BrowserFileSystemHandle;
  if (typeof browserHandle.queryPermission !== "function") {
    return "unsupported";
  }

  return await browserHandle.queryPermission({ mode });
}

async function requestPermission(
  handle: FileSystemDirectoryHandle | FileSystemFileHandle,
  mode: BrowserPermissionMode
): Promise<PermissionState | "unsupported"> {
  const browserHandle = handle as BrowserFileSystemHandle;
  if (typeof browserHandle.requestPermission !== "function") {
    return "unsupported";
  }

  return await browserHandle.requestPermission({ mode });
}

export class BrowserTaskFileStore {
  private readonly fileName: string;
  private readonly indexedDbName: string;
  private readonly indexedDbStore: string;
  private readonly indexedDbKey: string;
  private readonly pollIntervalMs: number;

  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private fileHandle: FileSystemFileHandle | null = null;
  private document: TaskDatabase | null = null;
  private status: BrowserTaskStatus;
  private statusListeners = new Set<StatusListener>();
  private snapshotListeners = new Set<SnapshotListener>();
  private pollTimer: number | null = null;
  private lastObservedFileModifiedAt: number | null = null;
  private lastSavedFileModifiedAt: number | null = null;

  constructor(options: BrowserTaskStoreOptions = {}) {
    this.fileName = options.fileName || DEFAULT_FILE_NAME;
    this.indexedDbName = options.indexedDbName || DEFAULT_IDB_NAME;
    this.indexedDbStore = options.indexedDbStore || DEFAULT_IDB_STORE;
    this.indexedDbKey = options.indexedDbKey || DEFAULT_IDB_KEY;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.status = {
      syncState: isBrowserFileSystemAvailable() ? "idle" : "unavailable",
      fileName: this.fileName,
      hasStoredHandle: false,
      hasConnectedHandle: false,
      permission: "unsupported",
      externalChangeDetected: false,
      pendingLocalChanges: false
    };
  }

  isSupported() {
    return isBrowserFileSystemAvailable();
  }

  getSnapshot() {
    if (!this.document) {
      return {
        document: createInitialDatabase(),
        status: deepClone(this.status)
      };
    }

    return {
      document: deepClone(this.document),
      status: deepClone(this.status)
    };
  }

  getStatus() {
    return deepClone(this.status);
  }

  onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  onSnapshotChange(listener: SnapshotListener) {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => this.snapshotListeners.delete(listener);
  }

  async restoreSavedConnection() {
    if (!this.isSupported()) {
      this.updateStatus({
        syncState: "unavailable",
        error: "This browser does not support File System Access API."
      });
      return this.getSnapshot();
    }

    const stored = await idbGet<StoredTaskHandles>(this.indexedDbName, this.indexedDbStore, this.indexedDbKey);
    if (!stored) {
      this.updateStatus({ hasStoredHandle: false });
      return this.getSnapshot();
    }

    this.status.hasStoredHandle = true;
    this.status.fileName = stored.fileName || this.fileName;
    this.status.directoryName = stored.directoryHandle?.name || this.status.directoryName;
    this.status.lastBoundAt = stored.connectedAt;

    const directoryPermission = stored.directoryHandle
      ? await queryPermission(stored.directoryHandle, "readwrite")
      : "unsupported";
    const filePermission = stored.fileHandle ? await queryPermission(stored.fileHandle, "readwrite") : "unsupported";

    this.status.permission =
      directoryPermission === "granted" || filePermission === "granted"
        ? "granted"
        : directoryPermission === "prompt" || filePermission === "prompt"
          ? "prompt"
          : directoryPermission === "denied" || filePermission === "denied"
            ? "denied"
            : "unsupported";

    if (this.status.permission !== "granted") {
      this.updateStatus({
        syncState: "permission-required",
        error: "Saved folder access needs to be granted again."
      });
      return this.getSnapshot();
    }

    this.directoryHandle = stored.directoryHandle || null;
    this.fileHandle = stored.fileHandle || null;
    this.status.hasConnectedHandle = true;
    this.status.syncState = "connected";
    this.status.error = undefined;
    stored.lastRestoredAt = nowIso();
    await idbSet(this.indexedDbName, this.indexedDbStore, this.indexedDbKey, stored);
    return await this.load();
  }

  async connectDirectory() {
    if (!this.isSupported()) {
      throw new Error("This browser does not support File System Access API.");
    }

    this.updateStatus({ syncState: "connecting", error: undefined });
    const picker = window as Window & {
      showDirectoryPicker?: (options?: BrowserDirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
    };

    if (typeof picker.showDirectoryPicker !== "function") {
      throw new Error("Directory picker is not available in this browser.");
    }

    const directoryHandle = await picker.showDirectoryPicker({ mode: "readwrite" });
    const permission = await requestPermission(directoryHandle, "readwrite");

    if (permission !== "granted") {
      this.updateStatus({
        syncState: "permission-required",
        permission,
        error: "Folder write permission was not granted."
      });
      throw new Error("Folder write permission was not granted.");
    }

    this.directoryHandle = directoryHandle;
    this.fileHandle = await this.ensureFileHandle(directoryHandle);

    const stored: StoredTaskHandles = {
      directoryHandle,
      fileHandle: this.fileHandle || undefined,
      fileName: this.fileName,
      connectedAt: nowIso()
    };

    await idbSet(this.indexedDbName, this.indexedDbStore, this.indexedDbKey, stored);
    this.status.hasStoredHandle = true;
    this.status.hasConnectedHandle = true;
    this.status.directoryName = directoryHandle.name;
    this.status.lastBoundAt = stored.connectedAt;
    this.status.permission = "granted";
    this.status.syncState = "connected";
    this.status.error = undefined;
    return await this.load();
  }

  async load() {
    if (!this.isSupported()) {
      this.updateStatus({
        syncState: "unavailable",
        error: "This browser does not support File System Access API."
      });
      throw new Error("This browser does not support File System Access API.");
    }

    this.updateStatus({ syncState: "loading", error: undefined });
    const fileHandle = await this.ensureOpenFileHandle();
    const permission = await requestPermission(fileHandle, "readwrite");

    if (permission === "denied") {
      this.updateStatus({
        syncState: "permission-required",
        permission,
        error: "File write permission was denied."
      });
      throw new Error("File write permission was denied.");
    }

    this.status.permission = permission === "unsupported" ? this.status.permission : permission;

    const file = await fileHandle.getFile();
    const existingText = file.size === 0 ? "" : await file.text();
    let parsed: TaskDatabase;

    if (existingText.trim().length === 0) {
      parsed = createInitialDatabase();
      await writeJsonFile(fileHandle, parsed);
    } else {
      try {
        parsed = normalizeDatabase(JSON.parse(existingText) as Partial<TaskDatabase>);
      } catch (error) {
        this.updateStatus({
          syncState: "error",
          error: error instanceof Error ? `JSON could not be read: ${error.message}` : "JSON could not be read."
        });
        throw error instanceof Error ? error : new Error("JSON could not be read.");
      }
    }

    this.document = parsed;
    this.lastObservedFileModifiedAt = file.lastModified || null;
    this.lastSavedFileModifiedAt = file.lastModified || null;
    this.updateStatus({
      syncState: "connected",
      error: undefined,
      lastLoadedAt: nowIso(),
      lastObservedFileModifiedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
      fileSize: file.size,
      externalChangeDetected: false,
      pendingLocalChanges: false
    });
    this.emitSnapshot();
    return this.getSnapshot();
  }

  async save(nextDocument: TaskDatabase) {
    const fileHandle = await this.ensureOpenFileHandle();
    const permission = await requestPermission(fileHandle, "readwrite");

    if (permission === "denied") {
      this.updateStatus({
        syncState: "permission-required",
        permission,
        error: "File write permission was denied."
      });
      throw new Error("File write permission was denied.");
    }

    const documentToSave = normalizeDatabase({
      ...nextDocument,
      updatedAt: nowIso()
    });

    this.updateStatus({
      syncState: "saving",
      error: undefined,
      pendingLocalChanges: true
    });

    await writeJsonFile(fileHandle, documentToSave);

    const file = await fileHandle.getFile();
    this.document = documentToSave;
    this.lastSavedFileModifiedAt = file.lastModified || null;
    this.lastObservedFileModifiedAt = file.lastModified || null;
    this.updateStatus({
      syncState: "connected",
      lastSavedAt: nowIso(),
      lastObservedFileModifiedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
      fileSize: file.size,
      externalChangeDetected: false,
      pendingLocalChanges: false,
      error: undefined
    });
    this.emitSnapshot();
    return this.getSnapshot();
  }

  startWatching(options: { intervalMs?: number; reloadOnChange?: boolean } = {}) {
    const intervalMs = options.intervalMs || this.pollIntervalMs;
    const reloadOnChange = options.reloadOnChange ?? true;

    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.pollTimer = window.setInterval(() => {
      void this.pollOnce(reloadOnChange);
    }, intervalMs);

    this.updateStatus({ syncState: "watching" });

    return () => {
      if (this.pollTimer !== null) {
        window.clearInterval(this.pollTimer);
        this.pollTimer = null;
      }

      this.updateStatus({
        syncState: this.document ? "connected" : this.status.syncState === "unavailable" ? "unavailable" : "idle"
      });
    };
  }

  async pollOnce(reloadOnChange = true) {
    if (!this.fileHandle) {
      return this.getSnapshot();
    }

    const file = await this.fileHandle.getFile();
    const observedAt = file.lastModified || null;
    const changedExternally =
      observedAt !== null &&
      this.lastObservedFileModifiedAt !== null &&
      observedAt !== this.lastObservedFileModifiedAt &&
      observedAt !== this.lastSavedFileModifiedAt;

    this.updateStatus({
      lastObservedFileModifiedAt: observedAt ? new Date(observedAt).toISOString() : undefined,
      fileSize: file.size
    });

    if (!changedExternally) {
      return this.getSnapshot();
    }

    this.updateStatus({
      syncState: "external-change",
      externalChangeDetected: true,
      lastExternalChangeAt: nowIso(),
      pendingLocalChanges: false
    });

    if (reloadOnChange) {
      await this.load();
    } else {
      this.emitSnapshot();
    }

    return this.getSnapshot();
  }

  private async ensureOpenFileHandle() {
    if (this.fileHandle) {
      return this.fileHandle;
    }

    if (this.directoryHandle) {
      this.fileHandle = await this.ensureFileHandle(this.directoryHandle);
      return this.fileHandle;
    }

    const restored = await idbGet<StoredTaskHandles>(this.indexedDbName, this.indexedDbStore, this.indexedDbKey);
    if (!restored) {
      throw new Error("Connect a folder first.");
    }

    this.status.hasStoredHandle = true;
    this.directoryHandle = restored.directoryHandle || null;
    this.fileHandle = restored.fileHandle || null;

    if (!this.fileHandle && this.directoryHandle) {
      this.fileHandle = await this.ensureFileHandle(this.directoryHandle);
      restored.fileHandle = this.fileHandle;
      restored.lastRestoredAt = nowIso();
      await idbSet(this.indexedDbName, this.indexedDbStore, this.indexedDbKey, restored);
    }

    if (!this.fileHandle) {
      throw new Error("Saved task file handle was not found. Bind the folder again.");
    }

    return this.fileHandle;
  }

  private async ensureFileHandle(directoryHandle: FileSystemDirectoryHandle) {
    const fileHandle = await directoryHandle.getFileHandle(this.fileName, { create: true });
    const file = await fileHandle.getFile();

    if (file.size === 0) {
      await writeJsonFile(fileHandle, createInitialDatabase());
    }

    return fileHandle;
  }

  private updateStatus(patch: Partial<BrowserTaskStatus>) {
    this.status = {
      ...this.status,
      ...patch
    };
    this.emitStatus();
  }

  private emitStatus() {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private emitSnapshot() {
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }
}

export function createBrowserTaskFileStore(options: BrowserTaskStoreOptions = {}) {
  return new BrowserTaskFileStore(options);
}
