"use client";

import { formatTaskTimestamp } from "@/lib/tasks/provider";
import { formatTaskPriorityLabel, formatTaskStatusLabel, isTaskOverdue, type TaskRecord } from "@/lib/tasks/store";

type Props = {
  tasks: TaskRecord[];
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
};

function dueLabel(task: TaskRecord) {
  if (!task.dueDate) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium"
  }).format(new Date(`${task.dueDate}T00:00:00`));
}

function statusTagClass(task: TaskRecord) {
  if (task.status === "blocked") {
    return "tag danger";
  }

  if (task.status === "done") {
    return "tag warn";
  }

  if (isTaskOverdue(task)) {
    return "tag danger";
  }

  return "tag";
}

export function TaskList({ tasks, selectedTaskId, onSelectTask }: Props) {
  if (tasks.length === 0) {
    return <div className="task-empty">No tasks match the current filters.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          className={`task-card${selectedTaskId === task.id ? " active" : ""}`}
          onClick={() => onSelectTask(task.id)}
        >
          <div className="task-card-top">
            <div>
              <div className="task-card-title">{task.title}</div>
              <div className="muted">{task.owner || "Unassigned"}</div>
            </div>
            <span className={statusTagClass(task)}>
              {isTaskOverdue(task) ? "Overdue" : formatTaskStatusLabel(task.status)}
            </span>
          </div>

          <p className="task-card-text">{task.details || "No extra detail yet."}</p>

          <div className="task-card-meta">
            <span className="tag slate">{formatTaskPriorityLabel(task.priority)}</span>
            <span className="tag slate">{dueLabel(task)}</span>
            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="task-card-footer">
            <span className="muted">Updated {formatTaskTimestamp(task.lastCommentAt || task.updatedAt)}</span>
            <span className="muted">{task.lastCommentPreview || "No comments yet."}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
