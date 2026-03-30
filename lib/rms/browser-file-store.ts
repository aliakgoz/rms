import type {
  EntityGroups,
  GenericTableRecord,
  Relationship,
  RequirementLevelSeed,
  RequirementRecord,
  SchemaTable
} from "./store";
import { createInitialDatabase, normalizeDatabase, RMS_FILE_NAME } from "./store";

const DEFAULT_FILE_NAME = RMS_FILE_NAME;
const DEFAULT_IDB_NAME = "rms-browser-file-store";
const DEFAULT_IDB_STORE = "handles";
const DEFAULT_IDB_KEY = "default";

export type BrowserRmsDocument = {
  version: number;
  createdAt: string;
  updatedAt: string;
  requirementLevels: RequirementLevelSeed[];
  entityGroups: EntityGroups;
  schemaTables: SchemaTable[];
  relationships: Relationship[];
  requirements: RequirementRecord[];
  recordsByTable: Record<string, GenericTableRecord[]>;
  [key: string]: unknown;
};

export type BrowserRmsPermissionState = PermissionState | "unsupported";
export type BrowserRmsSyncState =
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

export type BrowserRmsStatus = {
  syncState: BrowserRmsSyncState;
  fileName: string;
  directoryName?: string;
  lastBoundAt?: string;
  hasStoredHandle: boolean;
  hasConnectedHandle: boolean;
  permission: BrowserRmsPermissionState;
  lastLoadedAt?: string;
  lastSavedAt?: string;
  lastObservedFileModifiedAt?: string;
  lastExternalChangeAt?: string;
  fileSize?: number;
  externalChangeDetected: boolean;
  pendingLocalChanges: boolean;
  error?: string;
};

export type BrowserRmsSnapshot<TDocument extends BrowserRmsDocument = BrowserRmsDocument> = {
  document: TDocument;
  status: BrowserRmsStatus;
};

export type BrowserRmsStoreOptions = {
  fileName?: string;
  indexedDbName?: string;
  indexedDbStore?: string;
  indexedDbKey?: string;
  pollIntervalMs?: number;
};

type BrowserRmsPermissionMode = "read" | "readwrite";

type BrowserDirectoryPickerOptions = {
  mode?: BrowserRmsPermissionMode;
};

type BrowserFileSystemHandle = FileSystemHandle & {
  queryPermission?: (descriptor: { mode: BrowserRmsPermissionMode }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: BrowserRmsPermissionMode }) => Promise<PermissionState>;
};

type StoredBrowserHandles = {
  directoryHandle?: FileSystemDirectoryHandle;
  fileHandle?: FileSystemFileHandle;
  fileName: string;
  connectedAt: string;
  lastRestoredAt?: string;
};

type StatusListener = (status: BrowserRmsStatus) => void;
type SnapshotListener<TDocument extends BrowserRmsDocument> = (snapshot: BrowserRmsSnapshot<TDocument>) => void;

function nowIso() {
  return new Date().toISOString();
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createEmptyDocument(): BrowserRmsDocument {
  return createInitialDatabase();
}

function normalizeDocument(input: Partial<BrowserRmsDocument> | undefined): BrowserRmsDocument {
  return normalizeDatabase(input);
}

function isBrowserFileSystemAvailable() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && "indexedDB" in window;
}

async function readJsonFile<T>(fileHandle: FileSystemFileHandle): Promise<T> {
  const file = await fileHandle.getFile();
  const text = await file.text();
  return JSON.parse(text) as T;
}

async function writeJsonFile(fileHandle: FileSystemFileHandle, value: unknown) {
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(value, null, 2));
  await writable.close();
}

async function openIndexedDb(name: string, storeName: string) {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB kullanilamiyor.");
  }

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName);
      }
    };

    request.onerror = () => {
      reject(request.error || new Error("IndexedDB acilamadi."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function idbGet<T>(name: string, storeName: string, key: string): Promise<T | undefined> {
  const database = await openIndexedDb(name, storeName);

  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error || new Error("IndexedDB okuma hatasi."));
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

      request.onerror = () => reject(request.error || new Error("IndexedDB yazma hatasi."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction hatasi."));
    });
  } finally {
    database.close();
  }
}

async function idbDelete(name: string, storeName: string, key: string) {
  const database = await openIndexedDb(name, storeName);

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error || new Error("IndexedDB silme hatasi."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction hatasi."));
    });
  } finally {
    database.close();
  }
}

async function queryPermission(
  handle: FileSystemDirectoryHandle | FileSystemFileHandle,
  mode: BrowserRmsPermissionMode
): Promise<PermissionState | "unsupported"> {
  const browserHandle = handle as BrowserFileSystemHandle;
  if (typeof browserHandle.queryPermission !== "function") {
    return "unsupported";
  }

  return await browserHandle.queryPermission({ mode });
}

async function requestPermission(
  handle: FileSystemDirectoryHandle | FileSystemFileHandle,
  mode: BrowserRmsPermissionMode
): Promise<PermissionState | "unsupported"> {
  const browserHandle = handle as BrowserFileSystemHandle;
  if (typeof browserHandle.requestPermission !== "function") {
    return "unsupported";
  }

  return await browserHandle.requestPermission({ mode });
}

export class BrowserRmsFileStore<TDocument extends BrowserRmsDocument = BrowserRmsDocument> {
  private readonly fileName: string;
  private readonly indexedDbName: string;
  private readonly indexedDbStore: string;
  private readonly indexedDbKey: string;
  private readonly pollIntervalMs: number;

  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private fileHandle: FileSystemFileHandle | null = null;
  private document: TDocument | null = null;
  private status: BrowserRmsStatus;
  private statusListeners = new Set<StatusListener>();
  private snapshotListeners = new Set<SnapshotListener<TDocument>>();
  private pollTimer: number | null = null;
  private lastObservedFileModifiedAt: number | null = null;
  private lastSavedFileModifiedAt: number | null = null;

  constructor(options: BrowserRmsStoreOptions = {}) {
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
        document: createEmptyDocument() as TDocument,
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

  onSnapshotChange(listener: SnapshotListener<TDocument>) {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => this.snapshotListeners.delete(listener);
  }

  async restoreSavedConnection() {
    if (!this.isSupported()) {
      this.updateStatus({
        syncState: "unavailable",
        error: "Bu tarayici File System Access API desteklemiyor."
      });
      return this.getSnapshot();
    }

    const stored = await idbGet<StoredBrowserHandles>(this.indexedDbName, this.indexedDbStore, this.indexedDbKey);
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

    const filePermission = stored.fileHandle
      ? await queryPermission(stored.fileHandle, "readwrite")
      : "unsupported";

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
        error: "Kayıtlı dosya erişimi için yeniden klasör izni gerekiyor."
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
      throw new Error("Bu tarayici File System Access API desteklemiyor.");
    }

    this.updateStatus({ syncState: "connecting", error: undefined });
    const picker = window as Window & {
      showDirectoryPicker?: (options?: BrowserDirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
    };

    if (typeof picker.showDirectoryPicker !== "function") {
      throw new Error("Bu tarayici klasor secme API'sini desteklemiyor.");
    }

    const directoryHandle = await picker.showDirectoryPicker({ mode: "readwrite" });
    const permission = await requestPermission(directoryHandle, "readwrite");

    if (permission !== "granted") {
      this.updateStatus({
        syncState: "permission-required",
        permission,
        error: "Klasor yazma izni verilmedi."
      });
      throw new Error("Klasor yazma izni verilmedi.");
    }

    this.directoryHandle = directoryHandle;
    this.fileHandle = await this.ensureFileHandle(directoryHandle);

    const stored: StoredBrowserHandles = {
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

  async clearSavedConnection() {
    await idbDelete(this.indexedDbName, this.indexedDbStore, this.indexedDbKey);
    this.directoryHandle = null;
    this.fileHandle = null;
    this.document = null;
    this.lastObservedFileModifiedAt = null;
    this.lastSavedFileModifiedAt = null;
    this.updateStatus({
      syncState: "idle",
      hasStoredHandle: false,
      hasConnectedHandle: false,
      directoryName: undefined,
      permission: "unsupported",
      externalChangeDetected: false,
      pendingLocalChanges: false,
      lastBoundAt: undefined,
      error: undefined,
      lastLoadedAt: undefined,
      lastSavedAt: undefined,
      lastObservedFileModifiedAt: undefined,
      lastExternalChangeAt: undefined,
      fileSize: undefined
    });
  }

  async load() {
    if (!this.isSupported()) {
      this.updateStatus({
        syncState: "unavailable",
        error: "Bu tarayici File System Access API desteklemiyor."
      });
      throw new Error("Bu tarayici File System Access API desteklemiyor.");
    }

    this.updateStatus({ syncState: "loading", error: undefined });
    const fileHandle = await this.ensureOpenFileHandle();
    const permission = await requestPermission(fileHandle, "readwrite");

    if (permission === "denied") {
      this.updateStatus({
        syncState: "permission-required",
        permission,
        error: "Dosya yazma izni reddedildi."
      });
      throw new Error("Dosya yazma izni reddedildi.");
    }

    this.status.permission = permission === "unsupported" ? this.status.permission : permission;

    const file = await fileHandle.getFile();
    const existingText = file.size === 0 ? "" : await file.text();
    let parsed: BrowserRmsDocument;

    if (existingText.trim().length === 0) {
      parsed = createEmptyDocument();
      await writeJsonFile(fileHandle, parsed);
    } else {
      try {
        parsed = normalizeDocument(JSON.parse(existingText) as Partial<BrowserRmsDocument>);
      } catch (error) {
        this.updateStatus({
          syncState: "error",
          error: error instanceof Error ? `JSON okunamadi: ${error.message}` : "JSON okunamadi."
        });
        throw error instanceof Error ? error : new Error("JSON okunamadi.");
      }
    }

    this.document = parsed as TDocument;
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

  async save(nextDocument: TDocument) {
    const fileHandle = await this.ensureOpenFileHandle();
    const permission = await requestPermission(fileHandle, "readwrite");

    if (permission === "denied") {
      this.updateStatus({
        syncState: "permission-required",
        permission,
        error: "Dosya yazma izni reddedildi."
      });
      throw new Error("Dosya yazma izni reddedildi.");
    }

    const documentToSave = normalizeDocument(nextDocument);
    documentToSave.updatedAt = nowIso();

    this.updateStatus({
      syncState: "saving",
      error: undefined,
      pendingLocalChanges: true
    });

    await writeJsonFile(fileHandle, documentToSave);

    const file = await fileHandle.getFile();
    this.document = documentToSave as TDocument;
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

  async ensureOpenFileHandle() {
    if (this.fileHandle) {
      return this.fileHandle;
    }

    if (this.directoryHandle) {
      this.fileHandle = await this.ensureFileHandle(this.directoryHandle);
      return this.fileHandle;
    }

    const restored = await idbGet<StoredBrowserHandles>(this.indexedDbName, this.indexedDbStore, this.indexedDbKey);
    if (!restored) {
      throw new Error("Once klasor baglanmali.");
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
      throw new Error("Kayitli dosya taninmadi. Klasoru yeniden baglayin.");
    }

    return this.fileHandle;
  }

  private async ensureFileHandle(directoryHandle: FileSystemDirectoryHandle) {
    const fileHandle = await directoryHandle.getFileHandle(this.fileName, { create: true });
    const file = await fileHandle.getFile();

    if (file.size === 0) {
      await writeJsonFile(fileHandle, createEmptyDocument());
    }

    return fileHandle;
  }

  private updateStatus(patch: Partial<BrowserRmsStatus>) {
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

export function createBrowserRmsFileStore(options: BrowserRmsStoreOptions = {}) {
  return new BrowserRmsFileStore(options);
}

export function createEmptyBrowserRmsDocument() {
  return createEmptyDocument();
}
