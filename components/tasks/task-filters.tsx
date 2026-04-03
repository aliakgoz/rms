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
  onlyOpen: boolean;
  onOnlyOpenChange: (value: boolean) => void;
  onlyOverdue: boolean;
  onOnlyOverdueChange: (value: boolean) => void;
  owners: string[];
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
  onlyOpen,
  onOnlyOpenChange,
  onlyOverdue,
  onOnlyOverdueChange,
  owners
}: Props) {
  return (
    <section className="panel">
      <div className="page-head">
        <h2>Filters</h2>
        <p>Find active work fast without forcing a rigid workflow.</p>
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

        <div className="pill-row">
          <button
            className={`chip-button${onlyOpen ? " active" : ""}`}
            type="button"
            onClick={() => onOnlyOpenChange(!onlyOpen)}
          >
            open only
          </button>
          <button
            className={`chip-button${onlyOverdue ? " active" : ""}`}
            type="button"
            onClick={() => onOnlyOverdueChange(!onlyOverdue)}
          >
            overdue only
          </button>
        </div>
      </div>
    </section>
  );
}
