"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  buildSyncAlerts,
  describeSyncState,
  formatRmsTimestamp,
  useRmsData
} from "@/lib/rms/provider";

const links = [
  { href: "/dashboard", label: "Dashboard", note: "overview" },
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
  const { connected, status, errorMessage, connectFolder, reconnectFolder, refreshFromDisk } = useRmsData();
  const [isRunningAction, setIsRunningAction] = useState(false);

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

  const alerts = buildSyncAlerts(status, errorMessage);
  const connectionLabel = connected ? "Bagli" : "Bagli degil";
  const folderLabel = status.directoryName || "Secilmedi";
  const lastSeenLabel = formatRmsTimestamp(status.lastObservedFileModifiedAt || status.lastLoadedAt);

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
          <p className="eyebrow">Local DivvySync Store</p>
          <strong>{connectionLabel}</strong>
          <p className="muted">
            {connected
              ? `${folderLabel}/${status.fileName}`
              : "Ilk kullanimda DivvySync klasorunu baglayin."}
          </p>
          <div className="meta">
            <span className="tag">{describeSyncState(status)}</span>
            <span className="tag slate">{lastSeenLabel}</span>
          </div>
          <div className="side-actions">
            <button
              className="primary compact-button"
              type="button"
              onClick={() => void run(connectFolder)}
              disabled={isRunningAction}
            >
              {connected ? "Klasoru degistir" : "Klasoru Bagla"}
            </button>
            <button
              className="chip-button compact-button"
              type="button"
              onClick={() => void run(connected ? refreshFromDisk : reconnectFolder)}
              disabled={isRunningAction}
            >
              {connected ? "Yenile" : "Yeniden bagla"}
            </button>
          </div>
          {alerts[0] ? <p className="connection-note">{alerts[0]}</p> : null}
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
