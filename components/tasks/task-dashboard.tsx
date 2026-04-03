"use client";

import { useEffect, useMemo, useState } from "react";

import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { StorageConnectionPanel } from "@/components/rms/storage-connection-panel";
import { SyncStatusPanel } from "@/components/rms/sync-status-panel";
import { TaskDetail } from "@/components/tasks/task-detail";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickAdd } from "@/components/tasks/task-quick-add";
import {
  buildTaskAlerts,
  describeTaskConnectionTone,
  describeTaskSyncState,
  formatTaskTimestamp,
  useTaskData,
  useTaskSummary
} from "@/lib/tasks/provider";
import {
  formatTaskStatusLabel,
  getTaskComments,
  isTaskClosed,
  isTaskOverdue,
  sortTasks,
  type TaskSortOption
} from "@/lib/tasks/store";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortBy, setSortBy] = useState<TaskSortOption>("updated_desc");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [isRunningAction, setIsRunningAction] = useState(false);

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

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = db.tasks.filter((task) => {
      const haystack = [task.title, task.details, task.owner, task.tags.join(" "), task.lastCommentPreview || ""]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesOwner =
        ownerFilter === "all" ||
        (ownerFilter === "unassigned" ? !task.owner.trim() : task.owner.trim() === ownerFilter);
      const matchesOpen = !onlyOpen || !isTaskClosed(task);
      const matchesOverdue = !onlyOverdue || isTaskOverdue(task);

      return matchesQuery && matchesStatus && matchesPriority && matchesOwner && matchesOpen && matchesOverdue;
    });

    return sortTasks(filtered, sortBy);
  }, [db.tasks, onlyOpen, onlyOverdue, ownerFilter, priorityFilter, query, sortBy, statusFilter]);

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

  return (
    <div className="stack">
      <PageHero
        eyebrow="Task tracker"
        title="Simple shared work tracking"
        description="A second local database focused on fast task capture, live updates, comments, and visible overdue work without forcing a heavy workflow."
        right={
          <>
            <div className="hero-chip">
              <strong>{connected ? "Task file connected" : "Ready to bind a task file"}</strong>
              <div className="muted">{describeTaskSyncState(status)}</div>
            </div>
            <div className="hero-chip">
              <strong>{summary.pendingCount} pending items</strong>
              <div className="muted">Open work visible to every synced client.</div>
            </div>
            <div className="hero-chip">
              <strong>{summary.recentComments.length} recent comments</strong>
              <div className="muted">Latest shared updates across all tasks.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Pending", value: summary.pendingCount, note: "open tasks" },
          { label: "Overdue", value: summary.overdueCount, note: "late work items" },
          { label: "Due soon", value: summary.dueSoonCount, note: "next 3 days" },
          { label: "Blocked", value: summary.blockedCount, note: "waiting items" }
        ]}
      />

      <section className="page-grid wide">
        <StorageConnectionPanel
          connected={connected}
          folderName={status.directoryName}
          fileName={status.fileName}
          description="Yerel DivvySync klasorune baglanip task-tracker-data.json dosyasini tarayicidan yonetin."
          folderWaitingNote="Task klasoru bekleniyor."
          fileWaitingNote="task-tracker-data.json henuz baglanmadi."
          boundAtNote="Kayitli klasor izni tarayicinin yerel oturumunda saklanir."
          providerLabel="DivvySync"
          modeLabel="Local task file"
          lastBoundAtLabel={formatTaskTimestamp(status.lastBoundAt)}
          note={
            connected
              ? "The browser is reading and writing task-tracker-data.json inside the selected local DivvySync folder."
              : "Bind the DivvySync folder once. The task tracker creates task-tracker-data.json if it does not exist."
          }
          onConnectFolder={() => run(connectFolder)}
          onReconnect={() => run(reconnectFolder)}
          onRefresh={() => run(refreshFromDisk)}
          syncState={describeTaskConnectionTone(status)}
          connectLabel={isRunningAction ? "Working..." : connected ? "Switch folder" : "Bind task folder"}
          reconnectLabel="Reconnect"
          refreshLabel="Reload from disk"
        />

        <SyncStatusPanel
          lastLocalSaveAtLabel={formatTaskTimestamp(status.lastSavedAt)}
          lastSeenFileChangeAtLabel={formatTaskTimestamp(status.lastObservedFileModifiedAt)}
          lastSyncAtLabel={formatTaskTimestamp(status.lastExternalChangeAt || status.lastObservedFileModifiedAt)}
          externalChangeDetected={status.externalChangeDetected}
          pendingWriteCount={status.pendingLocalChanges ? 1 : 0}
          syncLagLabel={formatTaskTimestamp(status.lastObservedFileModifiedAt)}
          syncStateLabel={describeTaskSyncState(status)}
          alerts={alerts}
        />
      </section>

      <section className="task-shell">
        <div className="task-sidebar">
          <TaskQuickAdd />

          <TaskFilters
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            ownerFilter={ownerFilter}
            onOwnerFilterChange={setOwnerFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onlyOpen={onlyOpen}
            onOnlyOpenChange={setOnlyOpen}
            onlyOverdue={onlyOverdue}
            onOnlyOverdueChange={setOnlyOverdue}
            owners={owners}
          />

          <section className="panel">
            <div className="page-head">
              <h2>Latest Comments</h2>
              <p>What changed most recently, across the whole team.</p>
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

        <div className="stack">
          <section className="panel">
            <div className="page-head">
              <h2>Task Queue</h2>
              <p>Pending, overdue, blocked, and completed work in one sortable view.</p>
            </div>
            <TaskList tasks={filteredTasks} selectedTaskId={selectedTaskId} onSelectTask={setSelectedTaskId} />
          </section>

          <TaskDetail task={selectedTask} comments={selectedComments} />
        </div>
      </section>
    </div>
  );
}
