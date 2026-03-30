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

export default function DashboardPage() {
  const {
    db,
    connected,
    status,
    errorMessage,
    connectFolder,
    reconnectFolder,
    refreshFromDisk
  } = useRmsData();
  const { groupedByLevel, relationshipByTable } = useRmsSummary();
  const [isRunningAction, setIsRunningAction] = useState(false);

  async function run(action: () => Promise<void>) {
    setIsRunningAction(true);
    try {
      await action();
    } finally {
      setIsRunningAction(false);
    }
  }

  const topRelationshipTables = Object.entries(relationshipByTable)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const dominantLevels = Object.entries(groupedByLevel)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const alerts = buildSyncAlerts(status, errorMessage);

  return (
    <>
      <PageHero
        eyebrow="RMS cockpit"
        title="Traceability-first workspace"
        description="Static web uygulamasi tarayicidan yerel DivvySync klasorundeki rms-data.json dosyasini acip yazar. Senkronizasyonun tamami DivvySync tarafinda kalir."
        right={
          <>
            <div className="hero-chip">
              <strong>{db.schemaTables.length} schema tables</strong>
              <div className="muted">Bundled schema metadata always available.</div>
            </div>
            <div className="hero-chip">
              <strong>{db.relationships.length} table relationships</strong>
              <div className="muted">Traceability graph ships with the app.</div>
            </div>
            <div className="hero-chip">
              <strong>{connected ? "Folder connected" : "Awaiting folder bind"}</strong>
              <div className="muted">{describeSyncState(status)}</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Requirements", value: db.requirements.length, note: "local shared-file records" },
          { label: "Tables", value: db.schemaTables.length, note: "schema entities" },
          { label: "Relationships", value: db.relationships.length, note: "traceability edges" },
          { label: "Levels", value: db.requirementLevels.length, note: "requirement taxonomy" }
        ]}
      />

      <section className="page-grid wide">
        <StorageConnectionPanel
          connected={connected}
          folderName={status.directoryName}
          folderPath={connected ? "Browser-granted local DivvySync folder" : "Folder access not granted yet."}
          fileName={status.fileName}
          filePath={connected && status.directoryName ? `${status.directoryName}/${status.fileName}` : undefined}
          providerLabel="DivvySync"
          modeLabel="Local JSON file"
          lastBoundAtLabel={formatRmsTimestamp(status.lastBoundAt)}
          note={
            connected
              ? "Tarayici tam klasor yolunu vermez. Uygulama secilen yerel klasorde rms-data.json dosyasini kullanir."
              : "Ilk kullanimda DivvySync klasorunu secin. Uygulama rms-data.json yoksa olusturur."
          }
          onConnectFolder={() => run(connectFolder)}
          onReconnect={() => run(reconnectFolder)}
          onRefresh={() => run(refreshFromDisk)}
          syncState={describeConnectionTone(status)}
          connectLabel={isRunningAction ? "Calisiyor..." : connected ? "Klasoru degistir" : "Klasoru Bagla"}
          reconnectLabel="Yeniden bagla"
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
            <h2>Requirement Level Coverage</h2>
            <p>Distribution of live requirement records across the standard level model.</p>
          </div>
          <div className="list">
            {db.requirementLevels.map((level) => (
              <article key={level.level_code} className="list-card">
                <strong>{level.level_code} - {level.level_name}</strong>
                <div className="meta">
                  <span className="tag">{groupedByLevel[level.level_code] || 0} records</span>
                  {level.database_hint ? <span className="tag warn">implementation hint</span> : null}
                </div>
                <p className="muted">{level.short_definition}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="page-head">
              <h2>Most Connected Tables</h2>
              <p>Top schema entities by outgoing relationship count.</p>
            </div>
            <div className="list">
              {topRelationshipTables.map(([table, count]) => (
                <article key={table} className="list-card">
                  <strong>{table}</strong>
                  <div className="meta"><span className="tag">{count} outgoing links</span></div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="page-head">
              <h2>Operational Store</h2>
              <p>Browser-side local file binding summary.</p>
            </div>
            <div className="list">
              <article className="list-card">
                <strong>Folder handle</strong>
                <p className="muted">{status.directoryName || "No folder selected yet"}</p>
              </article>
              <article className="list-card">
                <strong>Dominant requirement levels</strong>
                <div className="pill-row">
                  {dominantLevels.length === 0 ? (
                    <span className="tag slate">no requirement records yet</span>
                  ) : (
                    dominantLevels.map(([level, count]) => (
                      <span key={level} className="tag">{level}: {count}</span>
                    ))
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
