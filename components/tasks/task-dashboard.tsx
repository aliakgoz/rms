"use client";

import { useEffect, useMemo, useState } from "react";

import { TaskDetail } from "@/components/tasks/task-detail";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickAdd } from "@/components/tasks/task-quick-add";
import {
  buildTaskAlerts,
  describeTaskSyncState,
  formatTaskTimestamp,
  useTaskData,
  useTaskSummary
} from "@/lib/tasks/provider";
import {
  getTaskComments,
  getTaskListCategory,
  formatTaskStatusLabel,
  sortTasks,
  type TaskSortOption
} from "@/lib/tasks/store";

type TaskViewFilter = "all" | "pending" | "overdue" | "due_soon" | "completed";

const VIEW_LABELS: Record<TaskViewFilter, string> = {
  all: "All",
  pending: "Pending",
  overdue: "Overdue",
  due_soon: "Due soon",
  completed: "Completed"
};

export function TaskDashboard() {
  const {
    db,
    connected,
    status,
    errorMessage,
    connectFolder,
    reconnectFolder,
    refreshFromDisk
  } = useTaskData();
  const summary = useTaskSummary();

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortBy, setSortBy] = useState<TaskSortOption>("updated_desc");
  const [viewFilter, setViewFilter] = useState<TaskViewFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  async function run(action: () => Promise<void>) {
    setIsRunningAction(true);
    try {
      await action();
    } finally {
      setIsRunningAction(false);
    }
  }

  const owners = useMemo(() => {
    return Array.from(
      new Set(
        db.tasks
          .map((task) => task.owner.trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));
  }, [db.tasks]);

  const groups = useMemo(() => {
    return [...db.groups].sort((left, right) => left.localeCompare(right, "tr"));
  }, [db.groups]);

  const viewCounts = useMemo(() => {
    return db.tasks.reduce<Record<TaskViewFilter, number>>(
      (counts, task) => {
        counts.all += 1;

        const category = getTaskListCategory(task);
        if (category === "pending") {
          counts.pending += 1;
        } else if (category === "overdue") {
          counts.overdue += 1;
        } else if (category === "due_soon") {
          counts.due_soon += 1;
        } else if (category === "completed") {
          counts.completed += 1;
        }

        return counts;
      },
      {
        all: 0,
        pending: 0,
        overdue: 0,
        due_soon: 0,
        completed: 0
      }
    );
  }, [db.tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = db.tasks.filter((task) => {
      const category = getTaskListCategory(task);
      const haystack = [task.title, task.group, task.details, task.owner, task.tags.join(" "), task.lastCommentPreview || ""]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesView = viewFilter === "all" || category === viewFilter;
      const matchesGroup = groupFilter === "all" || task.group === groupFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesOwner =
        ownerFilter === "all" ||
        (ownerFilter === "unassigned" ? !task.owner.trim() : task.owner.trim() === ownerFilter);

      return matchesQuery && matchesView && matchesGroup && matchesStatus && matchesPriority && matchesOwner;
    });

    return sortTasks(filtered, sortBy);
  }, [db.tasks, groupFilter, ownerFilter, priorityFilter, query, sortBy, statusFilter, viewFilter]);

  useEffect(() => {
    if (filteredTasks.length === 0) {
      setSelectedTaskId(undefined);
      return;
    }

    const stillSelected = filteredTasks.some((task) => task.id === selectedTaskId);
    if (!stillSelected) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) || db.tasks.find((task) => task.id === selectedTaskId);
  const selectedComments = useMemo(() => {
    return selectedTask ? getTaskComments(db, selectedTask.id) : [];
  }, [db, selectedTask]);
  const alerts = buildTaskAlerts(status, errorMessage);
  const currentViewLabel = VIEW_LABELS[viewFilter];

  function resetFilters() {
    setQuery("");
    setViewFilter("all");
    setGroupFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setOwnerFilter("all");
    setSortBy("updated_desc");
  }

  return (
    <div className="stack">
      <div className="task-stat-strip">
        {([
          { key: "all", count: viewCounts.all, note: "all tasks" },
          { key: "pending", count: viewCounts.pending, note: "normal queue" },
          { key: "overdue", count: viewCounts.overdue, note: "late items" },
          { key: "due_soon", count: viewCounts.due_soon, note: "next 3 days" },
          { key: "completed", count: viewCounts.completed, note: "done work" }
        ] as Array<{ key: TaskViewFilter; count: number; note: string }>).map((item) => (
          <button
            key={item.key}
            className={`task-stat-card${viewFilter === item.key ? " active" : ""}`}
            type="button"
            onClick={() => setViewFilter(item.key)}
          >
            <span className="eyebrow">{VIEW_LABELS[item.key]}</span>
            <strong>{item.count}</strong>
            <span className="muted">{item.note}</span>
          </button>
        ))}
      </div>

      <section className="task-shell">
        <section className="panel">
          <div className="task-panel-head">
            <div className="page-head">
              <h2>{currentViewLabel} Tasks</h2>
              <p>{filteredTasks.length} item in the current view. Select any row to open details.</p>
            </div>

            <div className="task-panel-actions">
              <button className="primary" type="button" onClick={() => setShowQuickAdd((current) => !current)}>
                {showQuickAdd ? "Hide quick add" : db.tasks.length === 0 ? "Add first task" : "New task"}
              </button>
              <button
                className="chip-button"
                type="button"
                onClick={() => void run(connectFolder)}
                disabled={isRunningAction}
              >
                {isRunningAction ? "Working..." : connected ? "Switch folder" : "Bind task folder"}
              </button>
              <button
                className="chip-button"
                type="button"
                onClick={() => void run(connected ? refreshFromDisk : reconnectFolder)}
                disabled={isRunningAction}
              >
                {connected ? "Reload" : "Reconnect"}
              </button>
              {(query ||
                groupFilter !== "all" ||
                statusFilter !== "all" ||
                priorityFilter !== "all" ||
                ownerFilter !== "all" ||
                sortBy !== "updated_desc" ||
                viewFilter !== "all") ? (
                <button className="chip-button" type="button" onClick={resetFilters}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="task-panel-status">
            <span className="tag">{connected ? "connected" : "offline"}</span>
            <span className="tag slate">{status.fileName}</span>
            <span className="tag slate">{status.directoryName || "folder not bound"}</span>
            <span className="tag slate">{describeTaskSyncState(status)}</span>
            <span className="tag slate">saved {formatTaskTimestamp(status.lastSavedAt)}</span>
            {status.externalChangeDetected ? <span className="tag danger">external change detected</span> : null}
          </div>

          {alerts[0] ? <p className="connection-note">{alerts[0]}</p> : null}

          {showQuickAdd ? <TaskQuickAdd onCreated={() => setShowQuickAdd(false)} /> : null}

          <TaskList
            tasks={filteredTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            query={query}
            onQueryChange={setQuery}
            ownerFilter={ownerFilter}
            onOwnerFilterChange={setOwnerFilter}
            groupFilter={groupFilter}
            onGroupFilterChange={setGroupFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            groups={groups}
            owners={owners}
          />
        </section>

        <div className="stack">
          <TaskDetail task={selectedTask} comments={selectedComments} />

          <section className="panel">
            <div className="page-head">
              <h2>Recent Team Updates</h2>
              <p>Latest comments visible to everyone using the shared task file.</p>
            </div>

            <div className="task-recent-list">
              {summary.recentComments.length === 0 ? (
                <div className="task-empty">No shared comments yet.</div>
              ) : (
                summary.recentComments.map((comment) => (
                  <article key={comment.id} className="task-recent-comment">
                    <div className="task-comment-top">
                      <strong>{comment.taskTitle}</strong>
                      <span className="muted">{formatTaskTimestamp(comment.createdAt)}</span>
                    </div>
                    <div className="meta">
                      <span className={comment.kind === "comment" ? "tag" : "tag warn"}>{comment.kind}</span>
                      <span className="tag slate">{comment.author || "anonymous"}</span>
                      <span className="tag slate">{formatTaskStatusLabel(comment.taskStatus)}</span>
                    </div>
                    <p>{comment.body}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
