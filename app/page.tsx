"use client";

import { useState } from "react";

import { StorageConnectionPanel } from "@/components/rms/storage-connection-panel";
import { SyncStatusPanel } from "@/components/rms/sync-status-panel";
import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import {
  buildSyncAlerts,
  describeConnectionTone,
  describeSyncState,
  formatLagLabel,
  formatRmsTimestamp,
  useRmsData,
  useRmsSummary
} from "@/lib/rms/provider";

const quickLinks = [
  { href: "./dashboard.html", label: "Dashboard" },
  { href: "./tasks.html", label: "Tasks" },
  { href: "./requirements.html", label: "Requirements" },
  { href: "./workbench.html", label: "Workbench" },
  { href: "./traceability.html", label: "Traceability" }
];

export default function HomePage() {
  const { db, status, connected, errorMessage, connectFolder, refreshFromDisk } = useRmsData();
  const { totalRecords } = useRmsSummary();
  const [isRunningAction, setIsRunningAction] = useState(false);

  async function run(action: () => Promise<void>) {
    setIsRunningAction(true);
    try {
      await action();
    } catch {
      // Error text is shown by the shared RMS context panels.
    } finally {
      setIsRunningAction(false);
    }
  }

  const alerts = buildSyncAlerts(status, errorMessage);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <PageHero
        eyebrow="Static file workspace"
        title="RMS connected to your local DivvySync folder"
        description="Open the published static site, bind your local rms-data.json once, and keep editing while DivvySync handles cloud sync in the background."
        right={
          <>
            <div className="hero-chip">
              <strong>{connected ? "Folder connected" : "Ready to bind"}</strong>
              <div className="muted">{describeSyncState(status)}</div>
            </div>
            <div className="hero-chip">
              <strong>{db.schemaTables.length} schema tables</strong>
              <div className="muted">Bundled with the static app.</div>
            </div>
            <div className="hero-chip">
              <strong>{totalRecords} stored records</strong>
              <div className="muted">Local file backed.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Requirements", value: db.requirements.length, note: "local records" },
          { label: "Tables", value: db.schemaTables.length, note: "schema package" },
          { label: "Relationships", value: db.relationships.length, note: "traceability graph" },
          { label: "Status", value: describeSyncState(status), note: connected ? "connected folder" : "waiting for bind" }
        ]}
      />

      <section className="page-grid wide">
        <StorageConnectionPanel
          connected={connected}
          folderName={status.directoryName}
          fileName={status.fileName}
          providerLabel="DivvySync"
          modeLabel="Browser local file"
          lastBoundAtLabel={formatRmsTimestamp(status.lastBoundAt)}
          note={
            connected
              ? "Tarayici secilen klasordeki rms-data.json ile calisiyor."
              : "Ilk kullanimda DivvySync klasorunu baglayin."
          }
          onConnectFolder={() => run(connectFolder)}
          onRefresh={() => run(refreshFromDisk)}
          syncState={describeConnectionTone(status)}
          connectLabel={isRunningAction ? "Calisiyor..." : "Klasoru Bagla"}
          refreshLabel="Diskten yenile"
        />

        <SyncStatusPanel
          lastLocalSaveAtLabel={formatRmsTimestamp(status.lastSavedAt)}
          lastSeenFileChangeAtLabel={formatRmsTimestamp(status.lastObservedFileModifiedAt)}
          lastSyncAtLabel={formatRmsTimestamp(status.lastExternalChangeAt || status.lastObservedFileModifiedAt)}
          externalChangeDetected={status.externalChangeDetected}
          pendingWriteCount={status.pendingLocalChanges ? 1 : 0}
          syncLagLabel={formatLagLabel(status.lastObservedFileModifiedAt)}
          syncStateLabel={describeSyncState(status)}
          alerts={alerts}
        />
      </section>

      <section className="split">
        <div className="panel">
          <div className="page-head">
            <h2>Fast Start</h2>
            <p>Core areas are one click away. Relative links work both on file:// and cloud hosting.</p>
          </div>
          <div className="pill-row">
            {quickLinks.map((item) => (
              <a key={item.href} className="tag" href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="page-head">
            <h2>How it works</h2>
            <p>Bind the folder once, then write directly to local rms-data.json.</p>
          </div>
          <div className="list">
            <article className="list-card">
              <strong>1. Open site</strong>
              <p className="muted">Use the published static site or the local exported index.html.</p>
            </article>
            <article className="list-card">
              <strong>2. Bind folder</strong>
              <p className="muted">Choose the local DivvySync folder that contains rms-data.json.</p>
            </article>
            <article className="list-card">
              <strong>3. Edit data</strong>
              <p className="muted">Requirements and schema records are written locally; sync stays in DivvySync.</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
