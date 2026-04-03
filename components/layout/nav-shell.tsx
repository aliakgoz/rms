"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  buildSyncAlerts,
  describeSyncState,
  formatRmsTimestamp,
  useRmsData
} from "@/lib/rms/provider";
import {
  buildTaskAlerts,
  describeTaskSyncState,
  formatTaskTimestamp,
  useTaskData
} from "@/lib/tasks/provider";

const links = [
  { href: "/dashboard", label: "Dashboard", note: "overview" },
  { href: "/tasks", label: "Tasks", note: "work tracking" },
  { href: "/requirements", label: "Requirements", note: "core records" },
  { href: "/workbench", label: "Workbench", note: "data entry" },
  { href: "/traceability", label: "Traceability", note: "network" },
  { href: "/verification", label: "Verification", note: "evidence" },
  { href: "/documents", label: "Documents", note: "sources" },
  { href: "/decisions", label: "Decisions", note: "rationale" },
  { href: "/baselines", label: "Baselines", note: "configuration" },
  { href: "/schedule", label: "Schedule", note: "programme" },
  { href: "/graph", label: "Schema Graph", note: "metadata" }
] as const;

function normalizeRoute(pathname: string) {
  const normalized = pathname
    .replace(/\/index\.html$/i, "")
    .replace(/\.html$/i, "")
    .replace(/\/$/, "");

  return normalized.length === 0 ? "/" : normalized;
}

function toStaticHref(route: string) {
  if (route === "/") {
    return "./index.html";
  }

  return `.${route}.html`;
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeRoute = normalizeRoute(pathname);
  const rms = useRmsData();
  const tasks = useTaskData();
  const [isRunningAction, setIsRunningAction] = useState(false);
  const isTaskRoute = activeRoute === "/tasks";
  const workspace = isTaskRoute ? tasks : rms;

  async function run(action: () => Promise<void>) {
    setIsRunningAction(true);
    try {
      await action();
    } catch {
      // Status is surfaced via the shared store context.
    } finally {
      setIsRunningAction(false);
    }
  }

  const alerts = isTaskRoute
    ? buildTaskAlerts(tasks.status, tasks.errorMessage)
    : buildSyncAlerts(rms.status, rms.errorMessage);
  const connectionLabel = workspace.connected ? "Bagli" : "Bagli degil";
  const folderLabel = workspace.status.directoryName || "Secilmedi";
  const lastSeenLabel = isTaskRoute
    ? formatTaskTimestamp(tasks.status.lastObservedFileModifiedAt || tasks.status.lastLoadedAt)
    : formatRmsTimestamp(rms.status.lastObservedFileModifiedAt || rms.status.lastLoadedAt);
  const storeTitle = isTaskRoute ? "Task Tracker Store" : "Local DivvySync Store";
  const connectLabel = workspace.connected ? "Klasoru degistir" : "Klasoru Bagla";
  const refreshLabel = workspace.connected ? "Yenile" : "Yeniden bagla";
  const syncLabel = isTaskRoute ? describeTaskSyncState(tasks.status) : describeSyncState(rms.status);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <a className="brand-link" href={toStaticHref("/")} aria-label="RMS home">
            <p className="eyebrow">Requirement Management System</p>
            <h1>RMS</h1>
          </a>
          <p>Traceability-first workspace built for local DivvySync files and static web hosting.</p>
        </div>

        <nav className="nav-group">
          {links.map((link) => (
            <a
              key={link.href}
              href={toStaticHref(link.href)}
              className={`nav-link${activeRoute === link.href ? " active" : ""}`}
            >
              <span>{link.label}</span>
              <small>{link.note}</small>
            </a>
          ))}
        </nav>

        <div className="side-card">
          <p className="eyebrow">{storeTitle}</p>
          <strong>{connectionLabel}</strong>
          <p className="muted">
            {workspace.connected
              ? `${folderLabel}/${workspace.status.fileName}`
              : "Ilk kullanimda DivvySync klasorunu baglayin."}
          </p>
          <div className="meta">
            <span className="tag">{syncLabel}</span>
            <span className="tag slate">{lastSeenLabel}</span>
          </div>
          <div className="side-actions">
            <button
              className="primary compact-button"
              type="button"
              onClick={() => void run(workspace.connectFolder)}
              disabled={isRunningAction}
            >
              {connectLabel}
            </button>
            <button
              className="chip-button compact-button"
              type="button"
              onClick={() => void run(workspace.connected ? workspace.refreshFromDisk : workspace.reconnectFolder)}
              disabled={isRunningAction}
            >
              {refreshLabel}
            </button>
          </div>
          {alerts[0] ? <p className="connection-note">{alerts[0]}</p> : null}
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
