"use client";

import { useMemo, useState } from "react";

type Requirement = {
  id: string;
  req_code: string;
  req_uid: string;
  title: string;
  statement: string;
  level_code: string;
  requirement_kind: string;
  domain_type: string;
  status: string;
  priority: string;
  criticality: string;
  created_at: string;
};

type Level = {
  level_code: string;
  level_name: string;
};

export function RequirementsBrowser({
  requirements,
  levels
}: {
  requirements: Requirement[];
  levels: Level[];
}) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return requirements.filter((item) => {
      const matchesQuery =
        query.trim().length === 0 ||
        [item.req_code, item.req_uid, item.title, item.statement]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesLevel = levelFilter === "all" || item.level_code === levelFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesLevel && matchesStatus;
    });
  }, [levelFilter, query, requirements, statusFilter]);

  const statuses = Array.from(new Set(requirements.map((item) => item.status)));

  return (
    <div className="stack">
      <div className="toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, uid, title, statement" />
        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
          <option value="all">All levels</option>
          {levels.map((level) => (
            <option key={level.level_code} value={level.level_code}>
              {level.level_code} - {level.level_name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Level</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((requirement) => (
              <tr key={requirement.id}>
                <td>
                  <div><strong>{requirement.req_code}</strong></div>
                  <div className="muted">{requirement.req_uid}</div>
                </td>
                <td>
                  <div><strong>{requirement.title}</strong></div>
                  <div className="muted">{requirement.statement}</div>
                </td>
                <td>{requirement.level_code}</td>
                <td>{requirement.requirement_kind}</td>
                <td><span className="tag warn">{requirement.status}</span></td>
                <td><span className="tag slate">{requirement.priority}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="data-table-note">
        Showing {filtered.length} of {requirements.length} requirement records.
      </p>
    </div>
  );
}
