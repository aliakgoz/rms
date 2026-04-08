(() => {
  "use strict";

  const TASKS_FILE_NAME = "task-tracker-data.json";
  const DEFAULT_TASK_GROUPS = [
    "YYBT",
    "RAİT",
    "Stratejik Yönetim ve Planlama",
    "URAYP",
    "İhale - RAİT",
    "İhale - YYBT",
    "Yönetim Sistemi",
    "HYK",
    "Diğer"
  ];
  const TASK_STATUSES = ["open", "in_progress", "waiting", "blocked", "done", "cancelled"];
  const TASK_PRIORITIES = ["low", "normal", "high", "critical"];
  const TASK_SORT_OPTIONS = [
    { value: "updated_desc", label: "Latest" },
    { value: "due_asc", label: "Due date" },
    { value: "priority_desc", label: "Priority" },
    { value: "created_desc", label: "Newest" },
    { value: "comments_desc", label: "Comments" }
  ];
  const DEFAULT_STATUS = {
    syncState: "idle",
    fileName: TASKS_FILE_NAME,
    directoryName: "",
    hasStoredHandle: false,
    hasConnectedHandle: false,
    permission: "unsupported",
    lastBoundAt: "",
    lastLoadedAt: "",
    lastSavedAt: "",
    lastObservedFileModifiedAt: "",
    lastExternalChangeAt: "",
    fileSize: 0,
    externalChangeDetected: false,
    pendingLocalChanges: false,
    error: ""
  };
  const STORAGE = {
    dbName: "task-browser-file-store-standalone",
    storeName: "handles",
    key: "default"
  };
  const VIEW_LABELS = {
    all: "All",
    pending: "Pending",
    overdue: "Overdue",
    due_soon: "Due soon",
    completed: "Completed"
  };
  const state = {
    db: createInitialDatabase(),
    status: { ...DEFAULT_STATUS },
    selectedTaskId: "",
    viewFilter: "all",
    query: "",
    groupFilter: "all",
    statusFilter: "all",
    priorityFilter: "all",
    ownerFilter: "all",
    sortBy: "updated_desc",
    showQuickAdd: false,
    addingGroup: false,
    notice: "",
    noticeTone: "info",
    actionBusy: false,
    directoryHandle: null,
    fileHandle: null,
    watchTimer: null,
    lastObservedFileModifiedAt: 0,
    lastSavedFileModifiedAt: 0
  };

  const app = document.getElementById("app");

  function nowIso() {
    return new Date().toISOString();
  }

  function createUuid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }

    return "task-" + Date.now() + "-" + Math.random().toString(16).slice(2, 10);
  }

  function trimString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const result = [];

    values.forEach((value) => {
      const normalized = trimString(value);
      if (!normalized || seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      result.push(normalized);
    });

    return result;
  }

  function parseTags(input) {
    if (Array.isArray(input)) {
      return uniqueStrings(input.map(String));
    }

    if (typeof input === "string") {
      return uniqueStrings(input.split(","));
    }

    return [];
  }

  function normalizeDateInput(input) {
    const value = trimString(input);
    if (!value) {
      return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toISOString().slice(0, 10);
  }

  function asStatus(input) {
    return TASK_STATUSES.includes(input) ? input : "open";
  }

  function asPriority(input) {
    return TASK_PRIORITIES.includes(input) ? input : "normal";
  }

  function normalizeGroupName(input) {
    return trimString(input) || "Diğer";
  }

  function formatEnumLabel(value) {
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatTimestamp(value) {
    if (!value) {
      return "-";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function createInitialDatabase() {
    const timestamp = nowIso();
    return {
      version: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
      groups: [...DEFAULT_TASK_GROUPS],
      tasks: [],
      comments: []
    };
  }

  function normalizeComment(input) {
    const body = trimString(input && input.body);
    const taskId = trimString(input && input.taskId);

    if (!body || !taskId) {
      return null;
    }

    return {
      id: trimString(input.id) || createUuid(),
      taskId,
      body,
      author: trimString(input.author),
      createdAt: trimString(input.createdAt) || nowIso(),
      kind: input.kind === "update" || input.kind === "status-change" ? input.kind : "comment",
      statusFrom: input.statusFrom ? asStatus(input.statusFrom) : "",
      statusTo: input.statusTo ? asStatus(input.statusTo) : ""
    };
  }

  function normalizeTask(input, index) {
    const createdAt = trimString(input && input.createdAt) || nowIso();
    const updatedAt = trimString(input && input.updatedAt) || createdAt;
    const status = asStatus(input && input.status);
    const description = trimString(input && (input.description || input.details));
    const assignee = trimString(input && (input.assignee || input.owner));
    const dueAt = normalizeDateInput(input && (input.dueAt || input.dueDate));
    const group = normalizeGroupName(input && (input.group || input.groupName));

    return {
      id: trimString(input && input.id) || ("TASK-" + String(index + 1).padStart(4, "0") + "-" + createUuid().slice(-6)),
      title: trimString(input && input.title) || "Untitled task",
      group,
      description,
      details: description,
      status,
      priority: asPriority(input && input.priority),
      assignee,
      owner: assignee,
      createdBy: trimString(input && input.createdBy),
      dueAt,
      dueDate: dueAt,
      tags: parseTags(input && input.tags),
      createdAt,
      updatedAt,
      completedAt: status === "done" ? trimString(input && input.completedAt) || updatedAt : "",
      lastCommentAt: trimString(input && input.lastCommentAt),
      lastCommentPreview: trimString(input && input.lastCommentPreview)
    };
  }

  function syncTaskCommentMeta(tasks, comments) {
    const latestByTask = new Map();

    comments.forEach((comment) => {
      const current = latestByTask.get(comment.taskId);
      if (!current || new Date(comment.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        latestByTask.set(comment.taskId, comment);
      }
    });

    return tasks.map((task) => {
      const latestComment = latestByTask.get(task.id);
      return {
        ...task,
        details: task.description,
        owner: task.assignee,
        dueDate: task.dueAt,
        lastCommentAt: latestComment ? latestComment.createdAt : "",
        lastCommentPreview: latestComment ? latestComment.body.slice(0, 180) : ""
      };
    });
  }

  function syncTaskGroups(groups, tasks) {
    return uniqueStrings([].concat(DEFAULT_TASK_GROUPS, Array.isArray(groups) ? groups : [], tasks.map((task) => task.group)));
  }

  function normalizeDatabase(input) {
    const base = createInitialDatabase();
    const source = input && typeof input === "object" ? input : {};
    const comments = Array.isArray(source.comments)
      ? source.comments.map(normalizeComment).filter(Boolean)
      : [];
    const tasks = Array.isArray(source.tasks)
      ? source.tasks.map((task, index) => normalizeTask(task, index))
      : [];

    return {
      ...base,
      ...source,
      groups: syncTaskGroups(source.groups, tasks),
      tasks: syncTaskCommentMeta(tasks, comments),
      comments
    };
  }

  function isTaskOpen(task) {
    return task.status !== "done";
  }

  function isTaskOverdue(task, reference = new Date()) {
    if (!task.dueAt || !isTaskOpen(task)) {
      return false;
    }

    return new Date(task.dueAt + "T23:59:59").getTime() < reference.getTime();
  }

  function isTaskDueSoon(task, reference = new Date(), days = 3) {
    if (!task.dueAt || !isTaskOpen(task)) {
      return false;
    }

    const due = new Date(task.dueAt + "T23:59:59").getTime();
    const now = reference.getTime();
    return due >= now && due <= now + days * 24 * 60 * 60 * 1000;
  }

  function getTaskCategory(task) {
    if (task.status === "done") {
      return "completed";
    }
    if (isTaskOverdue(task)) {
      return "overdue";
    }
    if (isTaskDueSoon(task)) {
      return "due_soon";
    }
    if (isTaskOpen(task)) {
      return "pending";
    }
    return "other";
  }

  function getTaskComments(taskId) {
    return [...state.db.comments]
      .filter((comment) => comment.taskId === taskId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  function taskLastActivity(task) {
    return task.lastCommentAt || task.updatedAt || task.createdAt;
  }

  function priorityRank(priority) {
    return { low: 1, normal: 2, high: 3, critical: 4 }[priority] || 0;
  }

  function sortTasks(tasks, sortBy) {
    return [...tasks].sort((left, right) => {
      if (sortBy === "comments_desc") {
        const leftComment = left.lastCommentAt ? new Date(left.lastCommentAt).getTime() : 0;
        const rightComment = right.lastCommentAt ? new Date(right.lastCommentAt).getTime() : 0;
        if (leftComment !== rightComment) {
          return rightComment - leftComment;
        }
      }

      if (sortBy === "due_asc") {
        const leftDue = left.dueAt ? new Date(left.dueAt + "T23:59:59").getTime() : Number.POSITIVE_INFINITY;
        const rightDue = right.dueAt ? new Date(right.dueAt + "T23:59:59").getTime() : Number.POSITIVE_INFINITY;
        if (leftDue !== rightDue) {
          return leftDue - rightDue;
        }
      }

      if (sortBy === "priority_desc") {
        const rank = priorityRank(right.priority) - priorityRank(left.priority);
        if (rank !== 0) {
          return rank;
        }
      }

      if (sortBy === "created_desc") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      return new Date(taskLastActivity(right)).getTime() - new Date(taskLastActivity(left)).getTime();
    });
  }

  function summarizeDatabase() {
    const pendingTasks = state.db.tasks.filter(isTaskOpen);
    const recentComments = [...state.db.comments]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 8)
      .map((comment) => {
        const task = state.db.tasks.find((item) => item.id === comment.taskId);
        return {
          ...comment,
          taskTitle: task ? task.title : "Unknown task",
          taskStatus: task ? task.status : "open"
        };
      });

    return {
      all: state.db.tasks.length,
      pending: pendingTasks.length,
      overdue: pendingTasks.filter((task) => isTaskOverdue(task)).length,
      dueSoon: pendingTasks.filter((task) => isTaskDueSoon(task)).length,
      completed: state.db.tasks.filter((task) => task.status === "done").length,
      recentComments
    };
  }

  function createTaskRecord(input) {
    const db = normalizeDatabase(state.db);
    const now = nowIso();
    const task = normalizeTask(
      {
        title: input.title,
        group: input.group,
        description: input.details,
        status: input.status || "open",
        priority: input.priority || "normal",
        assignee: input.owner,
        createdBy: input.createdBy,
        dueAt: input.dueDate,
        tags: input.tags,
        createdAt: now,
        updatedAt: now
      },
      db.tasks.length
    );

    db.tasks.unshift(task);
    db.groups = syncTaskGroups(db.groups, db.tasks);
    db.updatedAt = now;

    const initialComment = trimString(input.initialComment);
    if (initialComment) {
      db.comments.unshift({
        id: createUuid(),
        taskId: task.id,
        body: initialComment,
        author: trimString(input.createdBy),
        createdAt: now,
        kind: "comment",
        statusFrom: "",
        statusTo: ""
      });
    }

    db.tasks = syncTaskCommentMeta(db.tasks, db.comments);
    db.groups = syncTaskGroups(db.groups, db.tasks);
    return { db, task: db.tasks.find((item) => item.id === task.id) || task };
  }

  function updateTaskRecord(taskId, input) {
    const db = normalizeDatabase(state.db);
    const index = db.tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      throw new Error("Task not found.");
    }

    const current = db.tasks[index];
    const now = nowIso();
    const nextStatus = input.status ? asStatus(input.status) : current.status;
    const nextTask = normalizeTask({
      ...current,
      title: input.title ?? current.title,
      group: input.group ?? current.group,
      description: input.details ?? current.description,
      status: nextStatus,
      priority: input.priority ?? current.priority,
      assignee: input.owner ?? current.assignee,
      dueAt: input.dueDate ?? current.dueAt,
      tags: input.tags !== undefined ? parseTags(input.tags) : current.tags,
      createdAt: current.createdAt,
      updatedAt: now,
      completedAt: nextStatus === "done" ? current.completedAt || now : "",
      lastCommentAt: current.lastCommentAt,
      lastCommentPreview: current.lastCommentPreview
    });

    db.tasks[index] = nextTask;
    db.updatedAt = now;
    db.groups = syncTaskGroups(db.groups, db.tasks);

    if (current.status !== nextTask.status) {
      db.comments.unshift({
        id: createUuid(),
        taskId,
        body: "Status changed from " + current.status + " to " + nextTask.status + ".",
        author: trimString(input.author),
        createdAt: now,
        kind: "status-change",
        statusFrom: current.status,
        statusTo: nextTask.status
      });
    }

    const note = trimString(input.note);
    if (note) {
      db.comments.unshift({
        id: createUuid(),
        taskId,
        body: note,
        author: trimString(input.author),
        createdAt: now,
        kind: "update",
        statusFrom: "",
        statusTo: ""
      });
    }

    db.tasks = syncTaskCommentMeta(db.tasks, db.comments);
    db.groups = syncTaskGroups(db.groups, db.tasks);
    return { db, task: db.tasks[index] };
  }

  function addTaskComment(taskId, body, author) {
    const db = normalizeDatabase(state.db);
    const task = db.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    const text = trimString(body);
    if (!text) {
      throw new Error("Comment body is required.");
    }

    db.comments.unshift({
      id: createUuid(),
      taskId,
      body: text,
      author: trimString(author),
      createdAt: nowIso(),
      kind: "comment",
      statusFrom: "",
      statusTo: ""
    });
    db.tasks = syncTaskCommentMeta(db.tasks, db.comments);
    db.updatedAt = nowIso();
    return { db };
  }

  function getOwners() {
    return uniqueStrings(state.db.tasks.map((task) => task.owner)).sort((left, right) => left.localeCompare(right, "tr"));
  }

  function getGroups() {
    return [...state.db.groups].sort((left, right) => left.localeCompare(right, "tr"));
  }

  function getFilteredTasks() {
    const query = state.query.trim().toLowerCase();
    return sortTasks(
      state.db.tasks.filter((task) => {
        const category = getTaskCategory(task);
        const haystack = [task.title, task.group, task.details, task.owner, task.tags.join(" "), task.lastCommentPreview || ""]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesView = state.viewFilter === "all" || category === state.viewFilter;
        const matchesGroup = state.groupFilter === "all" || task.group === state.groupFilter;
        const matchesStatus = state.statusFilter === "all" || task.status === state.statusFilter;
        const matchesPriority = state.priorityFilter === "all" || task.priority === state.priorityFilter;
        const matchesOwner =
          state.ownerFilter === "all" ||
          (state.ownerFilter === "unassigned" ? !task.owner.trim() : task.owner.trim() === state.ownerFilter);

        return matchesQuery && matchesView && matchesGroup && matchesStatus && matchesPriority && matchesOwner;
      }),
      state.sortBy
    );
  }

  function toneForStatus() {
    if (state.status.error || state.status.syncState === "error" || state.status.syncState === "permission-required") {
      return "error";
    }
    if (state.status.pendingLocalChanges || state.status.syncState === "saving" || state.status.syncState === "loading") {
      return "pending";
    }
    if (state.status.hasConnectedHandle) {
      return "connected";
    }
    return "offline";
  }

  function syncStateLabel() {
    switch (state.status.syncState) {
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
        return "unsupported";
      default:
        return "offline";
    }
  }

  function setNotice(text, tone = "info") {
    state.notice = text || "";
    state.noticeTone = tone;
  }

  function clearNotice() {
    state.notice = "";
    state.noticeTone = "info";
  }

  function isSupported() {
    return (
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof window.showDirectoryPicker === "function" &&
      typeof window.indexedDB !== "undefined"
    );
  }

  function openIndexedDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE.dbName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORAGE.storeName)) {
          database.createObjectStore(STORAGE.storeName);
        }
      };

      request.onerror = () => reject(request.error || new Error("IndexedDB open failed."));
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function idbGet() {
    const db = await openIndexedDb();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORAGE.storeName, "readonly");
        const store = transaction.objectStore(STORAGE.storeName);
        const request = store.get(STORAGE.key);
        request.onerror = () => reject(request.error || new Error("IndexedDB read failed."));
        request.onsuccess = () => resolve(request.result);
      });
    } finally {
      db.close();
    }
  }

  async function idbSet(value) {
    const db = await openIndexedDb();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORAGE.storeName, "readwrite");
        const store = transaction.objectStore(STORAGE.storeName);
        const request = store.put(value, STORAGE.key);
        request.onerror = () => reject(request.error || new Error("IndexedDB write failed."));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
      });
    } finally {
      db.close();
    }
  }

  async function queryPermission(handle, mode) {
    if (!handle || typeof handle.queryPermission !== "function") {
      return "unsupported";
    }
    return handle.queryPermission({ mode });
  }

  async function requestPermission(handle, mode) {
    if (!handle || typeof handle.requestPermission !== "function") {
      return "unsupported";
    }
    return handle.requestPermission({ mode });
  }

  async function writeJsonFile(fileHandle, value) {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(value, null, 2));
    await writable.close();
  }

  async function ensureFileHandle(directoryHandle) {
    const fileHandle = await directoryHandle.getFileHandle(TASKS_FILE_NAME, { create: true });
    const file = await fileHandle.getFile();
    if (file.size === 0) {
      await writeJsonFile(fileHandle, createInitialDatabase());
    }
    return fileHandle;
  }

  async function loadFromDisk() {
    if (!state.fileHandle) {
      throw new Error("Bind the folder first.");
    }

    state.status.syncState = "loading";
    render();

    const permission = await requestPermission(state.fileHandle, "readwrite");
    if (permission === "denied") {
      state.status.syncState = "permission-required";
      state.status.permission = permission;
      state.status.error = "File write permission was denied.";
      render();
      throw new Error("File write permission was denied.");
    }

    const file = await state.fileHandle.getFile();
    const text = file.size === 0 ? "" : await file.text();
    let parsed;

    if (text.trim().length === 0) {
      parsed = createInitialDatabase();
      await writeJsonFile(state.fileHandle, parsed);
    } else {
      parsed = normalizeDatabase(JSON.parse(text));
    }

    state.db = parsed;
    state.lastObservedFileModifiedAt = file.lastModified || 0;
    state.lastSavedFileModifiedAt = file.lastModified || 0;
    state.status.syncState = "connected";
    state.status.error = "";
    state.status.permission = permission === "unsupported" ? state.status.permission : permission;
    state.status.lastLoadedAt = nowIso();
    state.status.lastObservedFileModifiedAt = file.lastModified ? new Date(file.lastModified).toISOString() : "";
    state.status.fileSize = file.size;
    state.status.externalChangeDetected = false;
    state.status.pendingLocalChanges = false;
    render();
  }

  async function saveToDisk(nextDb) {
    if (!state.fileHandle) {
      throw new Error("Task folder must be connected first.");
    }

    if (state.status.externalChangeDetected) {
      throw new Error("Task file changed outside this browser. Reload before saving.");
    }

    const permission = await requestPermission(state.fileHandle, "readwrite");
    if (permission === "denied") {
      state.status.syncState = "permission-required";
      state.status.permission = permission;
      state.status.error = "File write permission was denied.";
      render();
      throw new Error("File write permission was denied.");
    }

    state.status.syncState = "saving";
    state.status.pendingLocalChanges = true;
    render();

    const documentToSave = normalizeDatabase({
      ...nextDb,
      updatedAt: nowIso()
    });

    await writeJsonFile(state.fileHandle, documentToSave);
    const file = await state.fileHandle.getFile();
    state.db = documentToSave;
    state.lastSavedFileModifiedAt = file.lastModified || 0;
    state.lastObservedFileModifiedAt = file.lastModified || 0;
    state.status.syncState = "connected";
    state.status.lastSavedAt = nowIso();
    state.status.lastObservedFileModifiedAt = file.lastModified ? new Date(file.lastModified).toISOString() : "";
    state.status.fileSize = file.size;
    state.status.externalChangeDetected = false;
    state.status.pendingLocalChanges = false;
    state.status.error = "";
    render();
  }

  function stopWatching() {
    if (state.watchTimer) {
      window.clearInterval(state.watchTimer);
      state.watchTimer = null;
    }
  }

  function startWatching() {
    stopWatching();
    if (!state.fileHandle) {
      return;
    }

    state.watchTimer = window.setInterval(() => {
      void pollOnce();
    }, 4000);
    state.status.syncState = "watching";
    render();
  }

  async function pollOnce() {
    if (!state.fileHandle) {
      return;
    }

    const file = await state.fileHandle.getFile();
    const observedAt = file.lastModified || 0;
    const changedExternally =
      observedAt &&
      state.lastObservedFileModifiedAt &&
      observedAt !== state.lastObservedFileModifiedAt &&
      observedAt !== state.lastSavedFileModifiedAt;

    state.status.lastObservedFileModifiedAt = observedAt ? new Date(observedAt).toISOString() : "";
    state.status.fileSize = file.size;

    if (!changedExternally) {
      return;
    }

    state.status.syncState = "external-change";
    state.status.externalChangeDetected = true;
    state.status.lastExternalChangeAt = nowIso();
    state.status.pendingLocalChanges = false;
    setNotice("Task file changed in DivvySync or another client. Reload to see the latest version.", "error");
    render();
  }

  async function restoreSavedConnection() {
    if (!isSupported()) {
      state.status.syncState = "unavailable";
      state.status.error = "This browser cannot open a local folder handle in this mode.";
      render();
      return;
    }

    const stored = await idbGet();
    if (!stored) {
      render();
      return;
    }

    state.status.hasStoredHandle = true;
    state.status.fileName = stored.fileName || TASKS_FILE_NAME;
    state.status.directoryName = stored.directoryHandle && stored.directoryHandle.name ? stored.directoryHandle.name : "";
    state.status.lastBoundAt = stored.connectedAt || "";

    const directoryPermission = stored.directoryHandle ? await queryPermission(stored.directoryHandle, "readwrite") : "unsupported";
    const filePermission = stored.fileHandle ? await queryPermission(stored.fileHandle, "readwrite") : "unsupported";

    if (directoryPermission !== "granted" && filePermission !== "granted") {
      state.status.syncState = "permission-required";
      state.status.permission = directoryPermission === "prompt" || filePermission === "prompt" ? "prompt" : "denied";
      state.status.error = "Saved folder access needs to be granted again.";
      render();
      return;
    }

    state.directoryHandle = stored.directoryHandle || null;
    state.fileHandle = stored.fileHandle || (state.directoryHandle ? await ensureFileHandle(state.directoryHandle) : null);
    state.status.hasConnectedHandle = !!state.fileHandle;
    state.status.permission = "granted";
    state.status.syncState = "connected";
    state.status.error = "";
    await loadFromDisk();
    startWatching();
  }

  async function connectFolder() {
    if (!isSupported()) {
      setNotice(
        "Single-file mode needs desktop Chrome or Edge with local file access support. If the picker is blocked, open the file directly in Chrome or serve it from localhost/https.",
        "error"
      );
      state.status.syncState = "unavailable";
      render();
      return;
    }

    clearNotice();
    state.status.syncState = "connecting";
    render();

    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      const permission = await requestPermission(directoryHandle, "readwrite");

      if (permission !== "granted") {
        state.status.syncState = "permission-required";
        state.status.permission = permission;
        state.status.error = "Folder write permission was not granted.";
        render();
        return;
      }

      state.directoryHandle = directoryHandle;
      state.fileHandle = await ensureFileHandle(directoryHandle);
      state.status.hasStoredHandle = true;
      state.status.hasConnectedHandle = true;
      state.status.directoryName = directoryHandle.name;
      state.status.fileName = TASKS_FILE_NAME;
      state.status.permission = "granted";
      state.status.lastBoundAt = nowIso();
      state.status.error = "";
      await idbSet({
        directoryHandle,
        fileHandle: state.fileHandle,
        fileName: TASKS_FILE_NAME,
        connectedAt: state.status.lastBoundAt
      });
      await loadFromDisk();
      startWatching();
      setNotice("Task folder connected.", "success");
    } catch (error) {
      if (error && error.name === "AbortError") {
        state.status.syncState = state.fileHandle ? "connected" : "idle";
        render();
        return;
      }

      state.status.syncState = "error";
      state.status.error = error && error.message ? error.message : "Folder could not be connected.";
      setNotice(state.status.error, "error");
      render();
    }
  }

  function ensureSelectedTask(filteredTasks) {
    if (!filteredTasks.length) {
      state.selectedTaskId = "";
      return;
    }

    const selectedExists = filteredTasks.some((task) => task.id === state.selectedTaskId);
    if (!selectedExists) {
      state.selectedTaskId = filteredTasks[0].id;
    }
  }

  function selectedTask(filteredTasks) {
    return (
      filteredTasks.find((task) => task.id === state.selectedTaskId) ||
      state.db.tasks.find((task) => task.id === state.selectedTaskId) ||
      null
    );
  }

  function renderOptions(options, currentValue, labelFactory) {
    return options
      .map((option) => {
        const selected = option === currentValue ? " selected" : "";
        return '<option value="' + escapeHtml(option) + '"' + selected + ">" + escapeHtml(labelFactory(option)) + "</option>";
      })
      .join("");
  }

  function renderTaskRows(tasks) {
    if (!tasks.length) {
      return '<tr><td colspan="7"><div class="empty">No tasks match the current filters.</div></td></tr>';
    }

    return tasks
      .map((task) => {
        const selected = task.id === state.selectedTaskId ? " selected" : "";
        return (
          '<tr class="' +
          selected.trim() +
          '">' +
          "<td>" +
          '<button class="row-button" type="button" data-task-id="' +
          escapeHtml(task.id) +
          '">' +
          '<div class="task-title">' +
          escapeHtml(task.title) +
          "</div>" +
          '<div class="task-subline">' +
          escapeHtml(task.details || "No detail yet.") +
          "</div>" +
          '<div class="task-meta-row">' +
          task.tags.map((tag) => '<span class="pill slate">' + escapeHtml(tag) + "</span>").join("") +
          "</div>" +
          "</button>" +
          "</td>" +
          "<td>" + escapeHtml(task.owner || "Unassigned") + "</td>" +
          "<td>" + escapeHtml(task.group) + "</td>" +
          "<td>" + escapeHtml(formatEnumLabel(task.status)) + "</td>" +
          "<td>" + escapeHtml(formatEnumLabel(task.priority)) + "</td>" +
          "<td>" + escapeHtml(task.dueDate || "-") + "</td>" +
          "<td>" + escapeHtml(formatTimestamp(task.lastCommentAt || task.updatedAt)) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderQuickAdd(groups) {
    if (!state.showQuickAdd) {
      return "";
    }

    const groupField = state.addingGroup
      ? '<input name="newGroup" placeholder="New group name" />'
      : '<select name="group">' +
        groups
          .map((group) => {
            const selected = group === "Diğer" ? " selected" : "";
            return '<option value="' + escapeHtml(group) + '"' + selected + ">" + escapeHtml(group) + "</option>";
          })
          .join("") +
        "</select>";

    return (
      '<section class="panel">' +
      '<div class="panel-head"><div><h2>Quick Add</h2><p>Fast capture first. Only title is required; everything else is optional.</p></div></div>' +
      '<form id="quick-add-form" class="form-grid">' +
      '<label class="form-field full"><span class="field-label">Task title *</span><input name="title" required placeholder="Prepare review package for weekly meeting" /></label>' +
      '<label class="form-field"><span class="field-label">Owner</span><input name="owner" placeholder="Ali" /></label>' +
      '<label class="form-field"><div class="field-top"><span class="field-label">Group</span><button class="chip-button mini-button" type="button" data-action="toggle-add-group">+</button></div><span class="field-note">Select an existing group or add a new one.</span>' +
      groupField +
      "</label>" +
      '<label class="form-field"><span class="field-label">Due date</span><input name="dueDate" type="date" /></label>' +
      '<label class="form-field"><span class="field-label">Priority</span><select name="priority">' +
      renderOptions(TASK_PRIORITIES, "normal", formatEnumLabel) +
      "</select></label>" +
      '<label class="form-field"><span class="field-label">Created by</span><input name="createdBy" placeholder="Rayk team" /></label>' +
      '<label class="form-field full"><span class="field-label">Tags</span><input name="tags" placeholder="licensing, review, waiting" /></label>' +
      '<label class="form-field full"><span class="field-label">Details</span><textarea name="details" rows="4" placeholder="Add enough context for the next person who opens this task."></textarea></label>' +
      '<label class="form-field full"><span class="field-label">First note</span><textarea name="initialComment" rows="3" placeholder="Waiting for supplier feedback."></textarea></label>' +
      '<div class="form-actions full"><button class="primary-button" type="submit"' +
      (state.status.hasConnectedHandle ? "" : " disabled") +
      ">Add Task</button></div>" +
      "</form></section>"
    );
  }

  function renderDetails(task, comments, groups) {
    if (!task) {
      return '<section class="panel"><div class="empty">Select a task to inspect details, update status, or add comments.</div></section>';
    }

    return (
      '<section class="panel">' +
      '<div class="panel-head"><div><h2>Task Detail</h2><p>Edit fields freely, keep the audit trail in notes, and let everyone see the latest comment.</p></div></div>' +
      '<div class="details-meta">' +
      '<span class="pill slate">' + escapeHtml(task.group) + "</span>" +
      '<span class="pill">' + escapeHtml(formatEnumLabel(task.status)) + "</span>" +
      '<span class="pill slate">' + escapeHtml(formatEnumLabel(task.priority)) + "</span>" +
      '<span class="pill slate">created ' + escapeHtml(formatTimestamp(task.createdAt)) + "</span>" +
      '<span class="pill slate">updated ' + escapeHtml(formatTimestamp(task.lastCommentAt || task.updatedAt)) + "</span>" +
      "</div>" +
      '<form id="detail-form" class="stack" data-form-task-id="' + escapeHtml(task.id) + '">' +
      '<div class="form-grid">' +
      '<label class="form-field full"><span class="field-label">Title</span><input name="title" value="' + escapeHtml(task.title) + '"' + (state.status.hasConnectedHandle ? "" : " disabled") + " /></label>" +
      '<label class="form-field"><span class="field-label">Group</span><select name="group"' + (state.status.hasConnectedHandle ? "" : " disabled") + ">" +
      groups
        .map((group) => {
          const selected = group === task.group ? " selected" : "";
          return '<option value="' + escapeHtml(group) + '"' + selected + ">" + escapeHtml(group) + "</option>";
        })
        .join("") +
      "</select></label>" +
      '<label class="form-field"><span class="field-label">Owner</span><input name="owner" value="' + escapeHtml(task.owner) + '"' + (state.status.hasConnectedHandle ? "" : " disabled") + " /></label>" +
      '<label class="form-field"><span class="field-label">Status</span><select name="status"' + (state.status.hasConnectedHandle ? "" : " disabled") + ">" +
      renderOptions(TASK_STATUSES, task.status, formatEnumLabel) +
      "</select></label>" +
      '<label class="form-field"><span class="field-label">Priority</span><select name="priority"' + (state.status.hasConnectedHandle ? "" : " disabled") + ">" +
      renderOptions(TASK_PRIORITIES, task.priority, formatEnumLabel) +
      "</select></label>" +
      '<label class="form-field"><span class="field-label">Due date</span><input name="dueDate" type="date" value="' + escapeHtml(task.dueDate || "") + '"' + (state.status.hasConnectedHandle ? "" : " disabled") + " /></label>" +
      '<label class="form-field full"><span class="field-label">Tags</span><input name="tags" value="' + escapeHtml((task.tags || []).join(", ")) + '"' + (state.status.hasConnectedHandle ? "" : " disabled") + ' placeholder="licensing, review" /></label>' +
      '<label class="form-field full"><span class="field-label">Details</span><textarea name="details" rows="5"' + (state.status.hasConnectedHandle ? "" : " disabled") + ">" + escapeHtml(task.details || "") + "</textarea></label>" +
      '<label class="form-field"><span class="field-label">Update author</span><input name="author" placeholder="Ali"' + (state.status.hasConnectedHandle ? "" : " disabled") + " /></label>" +
      '<label class="form-field full"><span class="field-label">Update note</span><textarea name="note" rows="3" placeholder="Status changed after supplier call."' + (state.status.hasConnectedHandle ? "" : " disabled") + "></textarea></label>" +
      "</div>" +
      '<div class="form-actions"><button class="primary-button" type="submit"' + (state.status.hasConnectedHandle ? "" : " disabled") + ">Save Changes</button></div>" +
      "</form>" +
      '<div class="section-divider"></div>' +
      '<div class="stack"><div><h3>Comments</h3><p class="muted">Shared notes and updates visible to every synced client.</p></div>' +
      '<form id="comment-form" class="form-grid" data-form-task-id="' + escapeHtml(task.id) + '">' +
      '<label class="form-field"><span class="field-label">Comment author</span><input name="author" placeholder="Ali"' + (state.status.hasConnectedHandle ? "" : " disabled") + " /></label>" +
      '<label class="form-field full"><span class="field-label">New comment</span><textarea name="body" rows="3" placeholder="Need procurement feedback before moving this forward."' + (state.status.hasConnectedHandle ? "" : " disabled") + "></textarea></label>" +
      '<div class="form-actions full"><button class="primary-button" type="submit"' + (state.status.hasConnectedHandle ? "" : " disabled") + ">Add Comment</button></div>" +
      "</form>" +
      '<div class="comment-list">' +
      (comments.length
        ? comments
            .map((comment) => {
              return (
                '<article class="comment-card"><div class="comment-top"><strong>' +
                escapeHtml(comment.author || "Anonymous") +
                '</strong><span class="muted">' +
                escapeHtml(formatTimestamp(comment.createdAt)) +
                '</span></div><div class="tag-row"><span class="pill">' +
                escapeHtml(comment.kind) +
                '</span></div><div class="comment-body">' +
                escapeHtml(comment.body) +
                "</div></article>"
              );
            })
            .join("")
        : '<div class="empty">No comments yet.</div>') +
      "</div></div></section>"
    );
  }

  function renderRecentComments(summary) {
    return (
      '<section class="panel"><div class="panel-head"><div><h2>Recent Team Updates</h2><p>Latest comments visible to everyone using the shared task file.</p></div></div><div class="recent-list">' +
      (summary.recentComments.length
        ? summary.recentComments
            .map((comment) => {
              return (
                '<article class="recent-card"><div class="comment-top"><strong>' +
                escapeHtml(comment.taskTitle) +
                '</strong><span class="muted">' +
                escapeHtml(formatTimestamp(comment.createdAt)) +
                '</span></div><div class="tag-row"><span class="pill">' +
                escapeHtml(comment.kind) +
                '</span><span class="pill slate">' +
                escapeHtml(comment.author || "Anonymous") +
                '</span><span class="pill slate">' +
                escapeHtml(formatEnumLabel(comment.taskStatus)) +
                '</span></div><div class="comment-body">' +
                escapeHtml(comment.body) +
                "</div></article>"
              );
            })
            .join("")
        : '<div class="empty">No shared comments yet.</div>') +
      "</div></section>"
    );
  }

  function render() {
    const summary = summarizeDatabase();
    const groups = getGroups();
    const owners = getOwners();
    const filteredTasks = getFilteredTasks();
    ensureSelectedTask(filteredTasks);
    const task = selectedTask(filteredTasks);
    const comments = task ? getTaskComments(task.id) : [];
    const currentNotice =
      state.notice ||
      state.status.error ||
      (state.status.syncState === "unavailable"
        ? "Bind task folder needs desktop Chrome or Edge with local file access support."
        : "");

    app.innerHTML =
      '<main class="app">' +
      '<section class="stat-strip">' +
      [
        { key: "all", label: "All", count: summary.all, note: "all tasks" },
        { key: "pending", label: "Pending", count: summary.pending, note: "normal queue" },
        { key: "overdue", label: "Overdue", count: summary.overdue, note: "late items" },
        { key: "due_soon", label: "Due soon", count: summary.dueSoon, note: "next 3 days" },
        { key: "completed", label: "Completed", count: summary.completed, note: "done work" }
      ]
        .map((item) => {
          const active = item.key === state.viewFilter ? " active" : "";
          return (
            '<button class="stat-card' +
            active +
            '" type="button" data-view-filter="' +
            escapeHtml(item.key) +
            '">' +
            '<span class="eyebrow">' +
            escapeHtml(item.label) +
            "</span><strong>" +
            escapeHtml(item.count) +
            '</strong><div class="note">' +
            escapeHtml(item.note) +
            "</div></button>"
          );
        })
        .join("") +
      "</section>" +
      renderQuickAdd(groups) +
      '<section class="panel">' +
      '<div class="panel-head"><div><h2>All Tasks</h2><p>' +
      escapeHtml(filteredTasks.length) +
      ' item in the current view. Select any row to open details.</p></div><div class="table-actions">' +
      '<button class="primary-button" type="button" data-action="toggle-quick-add">' +
      (state.showQuickAdd ? "Hide quick add" : state.db.tasks.length ? "New task" : "Add first task") +
      "</button>" +
      '<button class="chip-button" type="button" data-action="connect" ' +
      (state.actionBusy ? "disabled" : "") +
      ">" +
      (state.actionBusy ? "Working..." : state.status.hasConnectedHandle ? "Switch folder" : "Bind task folder") +
      "</button>" +
      '<button class="chip-button" type="button" data-action="reload" ' +
      (state.actionBusy ? "disabled" : "") +
      ">" +
      (state.status.hasConnectedHandle ? "Reload" : "Reconnect") +
      "</button>" +
      (state.query ||
      state.groupFilter !== "all" ||
      state.statusFilter !== "all" ||
      state.priorityFilter !== "all" ||
      state.ownerFilter !== "all" ||
      state.sortBy !== "updated_desc" ||
      state.viewFilter !== "all"
        ? '<button class="ghost-button" type="button" data-action="clear-filters">Clear filters</button>'
        : "") +
      "</div></div>" +
      '<div class="hero-meta">' +
      '<span class="status-pill ' + toneForStatus() + '">' + escapeHtml(syncStateLabel()) + "</span>" +
      '<span class="pill slate">' + escapeHtml(state.status.fileName) + "</span>" +
      '<span class="pill slate">' + escapeHtml(state.status.directoryName || "folder not bound") + "</span>" +
      '<span class="pill slate">saved ' + escapeHtml(formatTimestamp(state.status.lastSavedAt)) + "</span>" +
      (state.status.externalChangeDetected ? '<span class="pill warn">external change detected</span>' : "") +
      "</div>" +
      (currentNotice ? '<div class="notice ' + escapeHtml(state.noticeTone || "info") + '">' + escapeHtml(currentNotice) + "</div>" : "") +
      '<div class="table-wrap"><table><thead><tr><th>Task</th><th>Owner</th><th>Group</th><th>Status</th><th>Priority</th><th>Due</th><th>Updated</th></tr>' +
      '<tr class="filter-row">' +
      '<th><input id="filter-query" placeholder="Search task" value="' + escapeHtml(state.query) + '" /></th>' +
      '<th><select id="filter-owner"><option value="all"' +
      (state.ownerFilter === "all" ? " selected" : "") +
      '>All</option><option value="unassigned"' +
      (state.ownerFilter === "unassigned" ? " selected" : "") +
      '>Unassigned</option>' +
      owners
        .map((owner) => {
          const selected = owner === state.ownerFilter ? " selected" : "";
          return '<option value="' + escapeHtml(owner) + '"' + selected + ">" + escapeHtml(owner) + "</option>";
        })
        .join("") +
      "</select></th>" +
      '<th><select id="filter-group"><option value="all"' +
      (state.groupFilter === "all" ? " selected" : "") +
      '>All</option>' +
      groups
        .map((group) => {
          const selected = group === state.groupFilter ? " selected" : "";
          return '<option value="' + escapeHtml(group) + '"' + selected + ">" + escapeHtml(group) + "</option>";
        })
        .join("") +
      "</select></th>" +
      '<th><select id="filter-status"><option value="all"' +
      (state.statusFilter === "all" ? " selected" : "") +
      '>All</option>' +
      renderOptions(TASK_STATUSES, state.statusFilter, formatEnumLabel) +
      "</select></th>" +
      '<th><select id="filter-priority"><option value="all"' +
      (state.priorityFilter === "all" ? " selected" : "") +
      '>All</option>' +
      renderOptions(TASK_PRIORITIES, state.priorityFilter, formatEnumLabel) +
      '</select></th><th></th><th><select id="filter-sort">' +
      TASK_SORT_OPTIONS
        .map((option) => {
          const selected = option.value === state.sortBy ? " selected" : "";
          return '<option value="' + escapeHtml(option.value) + '"' + selected + ">" + escapeHtml(option.label) + "</option>";
        })
        .join("") +
      "</select></th></tr></thead><tbody>" +
      renderTaskRows(filteredTasks) +
      "</tbody></table></div></section>" +
      renderDetails(task, comments, groups) +
      renderRecentComments(summary) +
      "</main>";

    bindEvents();
  }

  function bindEvents() {
    app.querySelectorAll("[data-view-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.viewFilter = button.getAttribute("data-view-filter") || "all";
        render();
      });
    });

    app.querySelectorAll(".row-button[data-task-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedTaskId = button.getAttribute("data-task-id") || "";
        render();
      });
    });

    const filterQuery = app.querySelector("#filter-query");
    if (filterQuery) {
      filterQuery.addEventListener("input", (event) => {
        state.query = event.target.value;
        render();
      });
    }

    [
      ["#filter-owner", "ownerFilter"],
      ["#filter-group", "groupFilter"],
      ["#filter-status", "statusFilter"],
      ["#filter-priority", "priorityFilter"],
      ["#filter-sort", "sortBy"]
    ].forEach(([selector, key]) => {
      const element = app.querySelector(selector);
      if (element) {
        element.addEventListener("change", (event) => {
          state[key] = event.target.value;
          render();
        });
      }
    });

    app.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.getAttribute("data-action");
      button.addEventListener("click", async () => {
        if (action === "toggle-quick-add") {
          state.showQuickAdd = !state.showQuickAdd;
          clearNotice();
          render();
          return;
        }

        if (action === "toggle-add-group") {
          state.addingGroup = !state.addingGroup;
          render();
          return;
        }

        if (action === "clear-filters") {
          state.query = "";
          state.groupFilter = "all";
          state.statusFilter = "all";
          state.priorityFilter = "all";
          state.ownerFilter = "all";
          state.sortBy = "updated_desc";
          state.viewFilter = "all";
          render();
          return;
        }

        if (state.actionBusy) {
          return;
        }

        state.actionBusy = true;
        render();

        try {
          if (action === "connect") {
            await connectFolder();
          } else if (action === "reload") {
            if (state.status.hasConnectedHandle) {
              await loadFromDisk();
              startWatching();
              setNotice("Task file reloaded.", "success");
            } else {
              await connectFolder();
            }
          }
        } finally {
          state.actionBusy = false;
          render();
        }
      });
    });

    const quickAddForm = app.querySelector("#quick-add-form");
    if (quickAddForm) {
      quickAddForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!state.status.hasConnectedHandle) {
          setNotice("Bind the task folder first.", "error");
          render();
          return;
        }

        const formData = new FormData(quickAddForm);
        const groupName = trimString(state.addingGroup ? formData.get("newGroup") : formData.get("group"));

        if (state.addingGroup && !groupName) {
          setNotice("New group name is required.", "error");
          render();
          return;
        }

        try {
          const result = createTaskRecord({
            title: formData.get("title"),
            group: groupName,
            details: formData.get("details"),
            owner: formData.get("owner"),
            dueDate: formData.get("dueDate"),
            priority: formData.get("priority"),
            createdBy: formData.get("createdBy"),
            tags: formData.get("tags"),
            initialComment: formData.get("initialComment")
          });
          await saveToDisk(result.db);
          state.selectedTaskId = result.task.id;
          state.showQuickAdd = false;
          state.addingGroup = false;
          setNotice(result.task.title + " added.", "success");
          render();
        } catch (error) {
          setNotice(error && error.message ? error.message : "Task could not be created.", "error");
          render();
        }
      });
    }

    const detailForm = app.querySelector("#detail-form");
    if (detailForm) {
      detailForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const taskId = detailForm.getAttribute("data-form-task-id");
        if (!taskId) {
          return;
        }

        if (!state.status.hasConnectedHandle) {
          setNotice("Bind the task folder first.", "error");
          render();
          return;
        }

        const formData = new FormData(detailForm);
        try {
          const result = updateTaskRecord(taskId, {
            title: formData.get("title"),
            group: formData.get("group"),
            details: formData.get("details"),
            status: formData.get("status"),
            priority: formData.get("priority"),
            owner: formData.get("owner"),
            dueDate: formData.get("dueDate"),
            tags: formData.get("tags"),
            author: formData.get("author"),
            note: formData.get("note")
          });
          await saveToDisk(result.db);
          state.selectedTaskId = result.task.id;
          setNotice("Task updated.", "success");
          render();
        } catch (error) {
          setNotice(error && error.message ? error.message : "Task could not be updated.", "error");
          render();
        }
      });
    }

    const commentForm = app.querySelector("#comment-form");
    if (commentForm) {
      commentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const taskId = commentForm.getAttribute("data-form-task-id");
        if (!taskId) {
          return;
        }

        if (!state.status.hasConnectedHandle) {
          setNotice("Bind the task folder first.", "error");
          render();
          return;
        }

        const formData = new FormData(commentForm);
        try {
          const result = addTaskComment(taskId, formData.get("body"), formData.get("author"));
          await saveToDisk(result.db);
          setNotice("Comment added.", "success");
          render();
        } catch (error) {
          setNotice(error && error.message ? error.message : "Comment could not be saved.", "error");
          render();
        }
      });
    }
  }

  async function boot() {
    render();
    try {
      await restoreSavedConnection();
    } catch (error) {
      setNotice(error && error.message ? error.message : "Saved connection could not be restored.", "error");
      render();
    }
  }

  boot();
})();
