"use client";

import {
  formatTaskPriorityLabel,
  formatTaskStatusLabel,
  TASK_PRIORITY_OPTIONS,
  TASK_SORT_OPTIONS,
  TASK_STATUS_OPTIONS,
  type TaskSortOption
} from "@/lib/tasks/store";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
  sortBy: TaskSortOption;
  onSortByChange: (value: TaskSortOption) => void;
  owners: string[];
  resultCount: number;
  onReset: () => void;
};

const SORT_LABELS: Record<TaskSortOption, string> = {
  updated_desc: "Latest activity",
  due_asc: "Earliest due date",
  priority_desc: "Highest priority",
  created_desc: "Newest first",
  comments_desc: "Most discussed"
};

export function TaskFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  sortBy,
  onSortByChange,
  owners,
  resultCount,
  onReset
}: Props) {
  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    ownerFilter !== "all" ||
    sortBy !== "updated_desc";

  return (
    <section className="panel">
      <div className="page-head">
        <h2>Task Filters</h2>
        <p>Search the current list and refine it without leaving the board.</p>
      </div>

      <div className="stack">
        <div className="toolbar">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, details, owner, tags, comment"
          />
        </div>

        <div className="form-grid">
          <label className="form-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
              <option value="all">All statuses</option>
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatTaskStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Priority</span>
            <select value={priorityFilter} onChange={(event) => onPriorityFilterChange(event.target.value)}>
              <option value="all">All priorities</option>
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatTaskPriorityLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Owner</span>
            <select value={ownerFilter} onChange={(event) => onOwnerFilterChange(event.target.value)}>
              <option value="all">All owners</option>
              <option value="unassigned">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => onSortByChange(event.target.value as TaskSortOption)}>
              {TASK_SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="task-filter-foot">
          <span className="muted">{resultCount} task shown</span>
          {hasActiveFilters ? (
            <button className="chip-button" type="button" onClick={onReset}>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
