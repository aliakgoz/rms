"use client";

export type SyncStatusPanelProps = {
  lastLocalSaveAtLabel?: string;
  lastSeenFileChangeAtLabel?: string;
  lastSyncAtLabel?: string;
  externalChangeDetected?: boolean;
  pendingWriteCount?: number;
  syncLagLabel?: string;
  syncStateLabel?: string;
  alerts?: string[];
};

export function SyncStatusPanel({
  lastLocalSaveAtLabel,
  lastSeenFileChangeAtLabel,
  lastSyncAtLabel,
  externalChangeDetected = false,
  pendingWriteCount = 0,
  syncLagLabel,
  syncStateLabel,
  alerts = []
}: SyncStatusPanelProps) {
  return (
    <section className="panel">
      <div className="page-head">
        <h2>Sync status</h2>
        <p>Yerel kaydetme, dosya degisimi ve DivvySync senkron durumu icin tek bakis alani.</p>
      </div>

      <div className="kpi-strip">
        <article className="kpi">
          <span className="eyebrow">Last local save</span>
          <strong>{lastLocalSaveAtLabel || "-"}</strong>
          <div className="muted">Tarayici tarafinda son yazma zamani.</div>
        </article>
        <article className="kpi">
          <span className="eyebrow">File change</span>
          <strong>{lastSeenFileChangeAtLabel || "-"}</strong>
          <div className="muted">Dosyada gorulen son degisiklik.</div>
        </article>
        <article className="kpi">
          <span className="eyebrow">Last sync</span>
          <strong>{lastSyncAtLabel || "-"}</strong>
          <div className="muted">DivvySync ile son gorulen esleme.</div>
        </article>
      </div>

      <div className="matrix">
        <div className="matrix-row">
          <strong>Sync state</strong>
          <div className="meta">
            <span className="tag">{syncStateLabel || "unknown"}</span>
            <span className={externalChangeDetected ? "tag warn" : "tag slate"}>
              {externalChangeDetected ? "external change detected" : "no external change"}
            </span>
            <span className="tag slate">{pendingWriteCount} pending writes</span>
          </div>
        </div>
        <div className="matrix-row">
          <strong>Lag</strong>
          <div>
            <div>{syncLagLabel || "Unknown"}</div>
            <div className="muted">Bu deger surekli degisebilir; ana entegratorden beslenmeli.</div>
          </div>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="list" style={{ marginTop: 12 }}>
          {alerts.map((alert) => (
            <article key={alert} className="list-card">
              <strong>{alert}</strong>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
