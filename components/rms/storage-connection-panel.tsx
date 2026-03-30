"use client";

type SyncState = "connected" | "pending" | "warning" | "error" | "offline";

export type StorageConnectionPanelProps = {
  connected: boolean;
  folderName?: string;
  folderPath?: string;
  fileName?: string;
  filePath?: string;
  providerLabel?: string;
  modeLabel?: string;
  lastBoundAtLabel?: string;
  note?: string;
  onConnectFolder?: () => void | Promise<void>;
  onReconnect?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  connectLabel?: string;
  reconnectLabel?: string;
  refreshLabel?: string;
  syncState?: SyncState;
};

function statusTagClass(syncState: SyncState) {
  switch (syncState) {
    case "connected":
      return "tag";
    case "pending":
      return "tag slate";
    case "warning":
      return "tag warn";
    case "error":
      return "tag danger";
    case "offline":
    default:
      return "tag slate";
  }
}

function statusText(syncState: SyncState) {
  switch (syncState) {
    case "connected":
      return "connected";
    case "pending":
      return "pending";
    case "warning":
      return "attention needed";
    case "error":
      return "error";
    case "offline":
    default:
      return "offline";
  }
}

export function StorageConnectionPanel({
  connected,
  folderName,
  folderPath,
  fileName = "rms-data.json",
  filePath,
  providerLabel = "DivvySync",
  modeLabel = "Local file mode",
  lastBoundAtLabel,
  note,
  onConnectFolder,
  onReconnect,
  onRefresh,
  connectLabel = "Klasoru Bagla",
  reconnectLabel = "Yeniden bagla",
  refreshLabel = "Yenile",
  syncState = connected ? "connected" : "offline"
}: StorageConnectionPanelProps) {
  return (
    <section className="panel">
      <div className="page-head">
        <h2>Storage connection</h2>
        <p>Yerel DivvySync klasorune baglanip dosya tabanli calisma durumunu yonetin.</p>
      </div>

      <div className="stack">
        <article className="callout">
          <strong>{connected ? "Klasor bagli" : "Klasor bagli degil"}</strong>
          <p>{note || "Ilk kullanima baslamak icin klasoru secin."}</p>
          <div className="pill-row">
            <span className={statusTagClass(syncState)}>{statusText(syncState)}</span>
            <span className="tag slate">{modeLabel}</span>
            <span className="tag">{providerLabel}</span>
          </div>
        </article>

        <div className="matrix">
          <div className="matrix-row">
            <strong>Folder</strong>
            <div>
              <div>{folderName || "Not connected"}</div>
              <div className="muted">{folderPath || "Klasor yolu bekleniyor."}</div>
            </div>
          </div>
          <div className="matrix-row">
            <strong>File</strong>
            <div>
              <div>{fileName}</div>
              <div className="muted">{filePath || "rms-data.json henuz baglanmadi."}</div>
            </div>
          </div>
          <div className="matrix-row">
            <strong>Bound at</strong>
            <div>
              <div>{lastBoundAtLabel || "Henuz baglanmadi."}</div>
              <div className="muted">Baglanti bilgisi ana entegratorden gelecek.</div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="primary" type="button" onClick={onConnectFolder} disabled={!onConnectFolder}>
            {connectLabel}
          </button>
          <button className="chip-button" type="button" onClick={onReconnect} disabled={!onReconnect}>
            {reconnectLabel}
          </button>
          <button className="chip-button" type="button" onClick={onRefresh} disabled={!onRefresh}>
            {refreshLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
