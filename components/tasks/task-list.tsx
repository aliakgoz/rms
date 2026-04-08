"use client";

import { formatTaskTimestamp } from "@/lib/tasks/provider";
import {
  formatTaskStatusLabel,
  TASK_PRIORITY_OPTIONS,
  TASK_SORT_OPTIONS,
  TASK_STATUS_OPTIONS,
  type TaskPriority,
  type TaskRecord,
  type TaskSortOption
} from "@/lib/tasks/store";

type Props = {
  tasks: TaskRecord[];
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
  groupFilter: string;
  onGroupFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  sortBy: TaskSortOption;
  onSortByChange: (value: TaskSortOption) => void;
  groups: string[];
  owners: string[];
};

function dueLabel(task: TaskRecord) {
  if (!task.dueDate) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium"
  }).format(new Date(`${task.dueDate}T00:00:00`));
}

function priorityLabel(priority: TaskPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

const SORT_LABELS: Record<TaskSortOption, string> = {
  updated_desc: "Latest",
  due_asc: "Due date",
  priority_desc: "Priority",
  created_desc: "Newest",
  comments_desc: "Comments"
};

export function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  query,
  onQueryChange,
  ownerFilter,
  onOwnerFilterChange,
  groupFilter,
  onGroupFilterChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortByChange,
  groups,
  owners
}: Props) {
  return (
    <div className="task-table-card">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Owner</th>
            <th>Group</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
            <th>Updated</th>
          </tr>
          <tr className="task-filter-row">
            <th>
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search task"
              />
            </th>
            <th>
              <select value={ownerFilter} onChange={(event) => onOwnerFilterChange(event.target.value)}>
                <option value="all">All</option>
                <option value="unassigned">Unassigned</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </th>
            <th>
              <select value={groupFilter} onChange={(event) => onGroupFilterChange(event.target.value)}>
                <option value="all">All</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </th>
            <th>
              <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
                <option value="all">All</option>
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatTaskStatusLabel(option)}
                  </option>
                ))}
              </select>
            </th>
            <th>
              <select value={priorityFilter} onChange={(event) => onPriorityFilterChange(event.target.value)}>
                <option value="all">All</option>
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {priorityLabel(option)}
                  </option>
                ))}
              </select>
            </th>
            <th />
            <th>
              <select value={sortBy} onChange={(event) => onSortByChange(event.target.value as TaskSortOption)}>
                {TASK_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr className="task-table-empty">
              <td colSpan={7}>
                <div className="task-empty">No tasks match the current filters.</div>
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr
                key={task.id}
                className={`task-row${selectedTaskId === task.id ? " active" : ""}`}
                tabIndex={0}
                onClick={() => onSelectTask(task.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectTask(task.id);
                  }
                }}
              >
                <td>
                  <div className="task-row-title">{task.title}</div>
                  <div className="task-row-note">{task.details || task.lastCommentPreview || "No extra detail yet."}</div>
                </td>
                <td>{task.owner || "Unassigned"}</td>
                <td>{task.group}</td>
                <td>{formatTaskStatusLabel(task.status)}</td>
                <td>{priorityLabel(task.priority)}</td>
                <td>{dueLabel(task)}</td>
                <td>{formatTaskTimestamp(task.lastCommentAt || task.updatedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
