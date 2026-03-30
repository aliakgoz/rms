export function KpiStrip({
  items
}: {
  items: Array<{ label: string; value: string | number; note?: string }>;
}) {
  return (
    <div className="kpi-strip">
      {items.map((item) => (
        <article key={item.label} className="kpi">
          <span className="kpi-accent" aria-hidden="true" />
          <div className="kpi-head">
            <span className="eyebrow">{item.label}</span>
            <span className="kpi-badge">live</span>
          </div>
          <strong>{item.value}</strong>
          {item.note ? <div className="muted">{item.note}</div> : null}
        </article>
      ))}
    </div>
  );
}
