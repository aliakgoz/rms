export function KpiStrip({
  items
}: {
  items: Array<{ label: string; value: string | number; note?: string }>;
}) {
  return (
    <div className="kpi-strip">
      {items.map((item) => (
        <article key={item.label} className="kpi">
          <span className="eyebrow">{item.label}</span>
          <strong>{item.value}</strong>
          {item.note ? <div className="muted">{item.note}</div> : null}
        </article>
      ))}
    </div>
  );
}
