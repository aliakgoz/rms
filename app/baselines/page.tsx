import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { getDashboardData } from "@/lib/rms/store";

export default function BaselinesPage() {
  const { db } = getDashboardData();
  const baselineTables = db.schemaTables.filter(
    (table) => table.table_name.includes("baseline") || table.table_name.includes("change")
  );
  const baselineLinks = db.relationships.filter(
    (item) =>
      item.from_table.includes("baseline") ||
      item.to_table.includes("baseline") ||
      item.from_table.includes("change") ||
      item.to_table.includes("change")
  );

  return (
    <>
      <PageHero
        eyebrow="Configuration control"
        title="Baselines and change management"
        description="Configuration state, formal baselines and controlled changes are visible as part of the same RMS workspace instead of being pushed into separate tools."
        right={
          <>
            <div className="hero-chip">
              <strong>{baselineTables.length} baseline tables</strong>
              <div className="muted">Change and baseline entities from the schema package.</div>
            </div>
            <div className="hero-chip">
              <strong>{baselineLinks.length} governance links</strong>
              <div className="muted">Connected configuration routes.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Tables", value: baselineTables.length, note: "change-control entities" },
          { label: "Links", value: baselineLinks.length, note: "connected governance edges" },
          { label: "Fields", value: baselineTables.reduce((sum, table) => sum + table.fields.length, 0), note: "baseline metadata fields" }
        ]}
      />

      <section className="section-grid">
        {baselineTables.map((table) => (
          <article key={table.table_name} className="panel">
            <div className="page-head">
              <h2>{table.table_name}</h2>
              <p>{table.table_purpose}</p>
            </div>
            <div className="field-cloud">
              {table.fields.slice(0, 8).map((field) => (
                <span key={field.name} className="tag slate">
                  {field.name}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
