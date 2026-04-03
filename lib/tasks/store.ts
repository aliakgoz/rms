export const TASKS_FILE_NAME = "task-tracker-data.json";

export const TASK_STATUSES = [
  "open",
  "in_progress",
  "waiting",
  "blocked",
  "done",
  "cancelled"
] as const;

export const TASK_STATUS_OPTIONS = TASK_STATUSES;
export const TASK_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export const TASK_PRIORITY_OPTIONS = TASK_PRIORITIES;
export const TASK_SORT_OPTIONS = [
  "updated_desc",
  "due_asc",
  "priority_desc",
  "created_desc",
  "comments_desc"
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskSortOption = (typeof TASK_SORT_OPTIONS)[number];
export type TaskCommentKind = "comment" | "update" | "status-change";

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  details: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  owner: string;
  createdBy: string;
  dueAt?: string;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  lastCommentAt?: string;
  lastCommentPreview?: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  body: string;
  author: string;
  createdAt: string;
  kind: TaskCommentKind;
  statusFrom?: TaskStatus;
  statusTo?: TaskStatus;
};

export type TaskDatabase = {
  version: number;
  createdAt: string;
  updatedAt: string;
  tasks: TaskRecord[];
  comments: TaskComment[];
};

export type TaskSummary = {
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  blockedCount: number;
  completedTodayCount: number;
  completedCount: number;
  recentComments: Array<TaskComment & { taskTitle: string; taskStatus: TaskStatus }>;
  recentOpenTasks: TaskRecord[];
  commentCountByTask: Record<string, number>;
  latestCommentByTask: Record<string, TaskComment>;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  details?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  owner?: string;
  createdBy?: string;
  dueAt?: string;
  dueDate?: string;
  tags?: string[] | string;
  initialComment?: string;
};

export type UpdateTaskInput = Partial<{
  title: string;
  description: string;
  details: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  owner: string;
  createdBy: string;
  dueAt: string;
  dueDate: string;
  tags: string[] | string;
  note: string;
  author: string;
}>;

export type AddTaskCommentInput = {
  taskId: string;
  body: string;
  author?: string;
  kind?: TaskCommentKind;
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1
};

function nowIso() {
  return new Date().toISOString();
}

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(input: unknown) {
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map((item) => String(item).trim()).filter(Boolean)));
  }

  if (typeof input === "string") {
    return Array.from(
      new Set(
        input
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return [] as string[];
}

function normalizeDateInput(input: unknown) {
  const value = trimString(input);
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function asStatus(input: unknown) {
  return TASK_STATUSES.includes(input as TaskStatus) ? (input as TaskStatus) : "open";
}

function asPriority(input: unknown) {
  return TASK_PRIORITIES.includes(input as TaskPriority) ? (input as TaskPriority) : "normal";
}

function startOfToday(reference = new Date()) {
  const value = new Date(reference);
  value.setHours(0, 0, 0, 0);
  return value;
}

function taskLastActivity(task: TaskRecord) {
  return task.lastCommentAt || task.updatedAt || task.createdAt;
}

function normalizeTask(input: Partial<TaskRecord>, index = 0): TaskRecord {
  const createdAt = trimString(input.createdAt) || nowIso();
  const updatedAt = trimString(input.updatedAt) || createdAt;
  const status = asStatus(input.status);
  const description = trimString(input.description) || trimString(input.details);
  const assignee = trimString(input.assignee) || trimString(input.owner);
  const dueAt = normalizeDateInput(input.dueAt) || normalizeDateInput(input.dueDate);
  const completedAt = status === "done" ? trimString(input.completedAt) || updatedAt : undefined;

  return {
    id: trimString(input.id) || `TASK-${String(index + 1).padStart(4, "0")}-${createUuid().slice(-6)}`,
    title: trimString(input.title) || "Untitled task",
    description,
    details: description,
    status,
    priority: asPriority(input.priority),
    assignee,
    owner: assignee,
    createdBy: trimString(input.createdBy),
    dueAt,
    dueDate: dueAt,
    tags: parseTags(input.tags),
    createdAt,
    updatedAt,
    completedAt,
    lastCommentAt: trimString(input.lastCommentAt) || undefined,
    lastCommentPreview: trimString(input.lastCommentPreview) || undefined
  };
}

function normalizeComment(input: Partial<TaskComment>): TaskComment | null {
  const body = trimString(input.body);
  const taskId = trimString(input.taskId);

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
    statusFrom: input.statusFrom ? asStatus(input.statusFrom) : undefined,
    statusTo: input.statusTo ? asStatus(input.statusTo) : undefined
  };
}

function syncTaskCommentMeta(tasks: TaskRecord[], comments: TaskComment[]) {
  const latestCommentByTask = new Map<string, TaskComment>();

  for (const comment of comments) {
    const current = latestCommentByTask.get(comment.taskId);
    if (!current || new Date(comment.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latestCommentByTask.set(comment.taskId, comment);
    }
  }

  return tasks.map((task) => {
    const latestComment = latestCommentByTask.get(task.id);
    return {
      ...task,
      details: task.description,
      owner: task.assignee,
      dueDate: task.dueAt,
      lastCommentAt: latestComment?.createdAt,
      lastCommentPreview: latestComment?.body.slice(0, 180)
    };
  });
}

function isClosed(status: TaskStatus) {
  return status === "done";
}

function formatEnumLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function createInitialTaskDatabase(): TaskDatabase {
  const timestamp = nowIso();
  return {
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    tasks: [],
    comments: []
  };
}

export function normalizeTaskDatabase(input: Partial<TaskDatabase> | null | undefined): TaskDatabase {
  const base = createInitialTaskDatabase();
  const current = input && typeof input === "object" ? input : {};
  const comments = Array.isArray(current.comments)
    ? current.comments
        .map((comment) => normalizeComment(comment))
        .filter((comment): comment is TaskComment => comment !== null)
    : [];
  const tasks = Array.isArray(current.tasks)
    ? current.tasks.map((task, index) => normalizeTask(task, index))
    : [];

  return {
    ...base,
    ...current,
    tasks: syncTaskCommentMeta(tasks, comments),
    comments
  };
}

export function createInitialDatabase() {
  return createInitialTaskDatabase();
}

export function normalizeDatabase(input: Partial<TaskDatabase> | null | undefined) {
  return normalizeTaskDatabase(input);
}

export function isTaskOpen(task: TaskRecord) {
  return !isClosed(task.status);
}

export function isTaskClosed(task: TaskRecord) {
  return isClosed(task.status);
}

export function formatTaskStatusLabel(status: TaskStatus) {
  return formatEnumLabel(status);
}

export function formatTaskPriorityLabel(priority: TaskPriority) {
  return formatEnumLabel(priority);
}

export function isTaskOverdue(task: TaskRecord, reference = new Date()) {
  if (!task.dueAt || !isTaskOpen(task)) {
    return false;
  }

  const due = new Date(`${task.dueAt}T23:59:59`);
  return due.getTime() < reference.getTime();
}

export function isTaskDueSoon(task: TaskRecord, reference = new Date(), days = 3) {
  if (!task.dueAt || !isTaskOpen(task)) {
    return false;
  }

  const due = new Date(`${task.dueAt}T23:59:59`).getTime();
  const now = reference.getTime();
  return due >= now && due <= now + days * 24 * 60 * 60 * 1000;
}

export function getTaskComments(dbInput: TaskDatabase, taskId: string) {
  const db = normalizeTaskDatabase(dbInput);
  return [...db.comments]
    .filter((comment) => comment.taskId === taskId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function sortTasks(tasksInput: TaskRecord[], sortBy: TaskSortOption) {
  return [...tasksInput].sort((left, right) => {
    if (sortBy === "comments_desc") {
      const leftComment = left.lastCommentAt ? new Date(left.lastCommentAt).getTime() : 0;
      const rightComment = right.lastCommentAt ? new Date(right.lastCommentAt).getTime() : 0;
      if (leftComment !== rightComment) {
        return rightComment - leftComment;
      }
    }

    if (sortBy === "due_asc") {
      const leftDue = left.dueAt ? new Date(`${left.dueAt}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.dueAt ? new Date(`${right.dueAt}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }
    }

    if (sortBy === "priority_desc") {
      const rank = PRIORITY_RANK[right.priority] - PRIORITY_RANK[left.priority];
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

export function summarizeTaskDatabase(dbInput: TaskDatabase): TaskSummary {
  const db = normalizeTaskDatabase(dbInput);
  const now = new Date();
  const commentCountByTask: Record<string, number> = {};
  const latestCommentByTask: Record<string, TaskComment> = {};

  for (const comment of db.comments) {
    commentCountByTask[comment.taskId] = (commentCountByTask[comment.taskId] || 0) + 1;
    const current = latestCommentByTask[comment.taskId];

    if (!current || new Date(comment.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latestCommentByTask[comment.taskId] = comment;
    }
  }

  const pendingTasks = db.tasks.filter(isTaskOpen);
  const completedTodayCount = db.tasks.filter((task) => {
    if (!task.completedAt) {
      return false;
    }

    return new Date(task.completedAt).getTime() >= startOfToday(now).getTime();
  }).length;
  const recentComments = [...db.comments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((comment) => {
      const task = db.tasks.find((item) => item.id === comment.taskId);
      return {
        ...comment,
        taskTitle: task?.title || "Unknown task",
        taskStatus: task?.status || "open"
      };
    });

  return {
    pendingCount: pendingTasks.length,
    overdueCount: pendingTasks.filter((task) => isTaskOverdue(task, now)).length,
    dueSoonCount: pendingTasks.filter((task) => isTaskDueSoon(task, now)).length,
    blockedCount: pendingTasks.filter((task) => task.status === "blocked" || task.status === "waiting").length,
    completedTodayCount,
    completedCount: db.tasks.filter((task) => task.status === "done").length,
    recentComments,
    recentOpenTasks: sortTasks(pendingTasks, "updated_desc").slice(0, 6),
    commentCountByTask,
    latestCommentByTask
  };
}

export function summarizeDatabase(dbInput: TaskDatabase) {
  return summarizeTaskDatabase(dbInput);
}

export function createTask(dbInput: TaskDatabase, input: CreateTaskInput) {
  const db = normalizeTaskDatabase(dbInput);
  const now = nowIso();
  const task = normalizeTask(
    {
      title: input.title,
      description: input.description ?? input.details,
      status: input.status || "open",
      priority: input.priority || "normal",
      assignee: input.assignee ?? input.owner,
      createdBy: input.createdBy,
      dueAt: input.dueAt ?? input.dueDate,
      tags: parseTags(input.tags),
      createdAt: now,
      updatedAt: now
    },
    db.tasks.length
  );

  db.tasks.unshift(task);
  db.updatedAt = now;

  const initialComment = trimString(input.initialComment);
  if (initialComment) {
    const result = addComment(db, {
      taskId: task.id,
      body: initialComment,
      author: input.createdBy,
      kind: "comment"
    });
    return { db: result.db, task: result.db.tasks.find((item) => item.id === task.id) || task, comment: result.comment };
  }

  db.tasks = syncTaskCommentMeta(db.tasks, db.comments);
  return { db, task };
}

export function updateTask(dbInput: TaskDatabase, taskId: string, input: UpdateTaskInput) {
  const db = normalizeTaskDatabase(dbInput);
  const index = db.tasks.findIndex((task) => task.id === taskId);

  if (index < 0) {
    throw new Error("Task not found.");
  }

  const current = db.tasks[index];
  const now = nowIso();
  const nextStatus = input.status ? asStatus(input.status) : current.status;
  const nextTask = normalizeTask(
    {
      ...current,
      title: input.title ?? current.title,
      description: input.description ?? input.details ?? current.description,
      status: nextStatus,
      priority: input.priority ?? current.priority,
      assignee: input.assignee ?? input.owner ?? current.assignee,
      createdBy: input.createdBy ?? current.createdBy,
      dueAt: input.dueAt ?? input.dueDate ?? current.dueAt,
      tags: input.tags !== undefined ? parseTags(input.tags) : current.tags,
      createdAt: current.createdAt,
      updatedAt: now,
      completedAt: nextStatus === "done" ? current.completedAt || now : undefined,
      lastCommentAt: current.lastCommentAt,
      lastCommentPreview: current.lastCommentPreview
    }
  );

  db.tasks[index] = nextTask;
  db.updatedAt = now;

  if (current.status !== nextTask.status) {
    db.comments.unshift({
      id: createUuid(),
      taskId,
      body: `Status changed from ${current.status} to ${nextTask.status}.`,
      author: trimString(input.author) || trimString(input.createdBy) || trimString(input.owner) || trimString(input.assignee),
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
      author: trimString(input.author) || trimString(input.createdBy) || trimString(input.owner) || trimString(input.assignee),
      createdAt: now,
      kind: "update"
    });
  }

  db.tasks = syncTaskCommentMeta(db.tasks, db.comments);
  return { db, task: db.tasks[index], comment: note ? db.comments[0] : undefined };
}

export function addTaskComment(dbInput: TaskDatabase, taskId: string, input: { body?: string; author?: string; kind?: TaskCommentKind }) {
  const db = normalizeTaskDatabase(dbInput);
  const taskExists = db.tasks.some((task) => task.id === taskId);

  if (!taskExists) {
    throw new Error("Task not found.");
  }

  const comment = normalizeComment({
    taskId,
    body: input.body,
    author: input.author,
    kind: input.kind || "comment",
    createdAt: nowIso()
  });

  if (!comment) {
    throw new Error("Comment body is required.");
  }

  db.comments.unshift(comment);
  db.tasks = syncTaskCommentMeta(db.tasks, db.comments);
  db.updatedAt = comment.createdAt;
  return { db, comment };
}

export function addComment(dbInput: TaskDatabase, input: AddTaskCommentInput) {
  return addTaskComment(dbInput, input.taskId, input);
}
