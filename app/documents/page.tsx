import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { getDashboardData } from "@/lib/rms/store";

export default function DocumentsPage() {
  const { db } = getDashboardData();
  const docTables = db.schemaTables.filter((table) => table.table_name.includes("document"));
  const docLinks = db.relationships.filter((item) => item.from_table.includes("document") || item.to_table.includes("document"));

  return (
    <>
      <PageHero
        eyebrow="Source governance"
        title="Documents and linking"
        description="Source records, document metadata and requirement references are surfaced as their own working slice of the RMS model."
        right={
          <>
            <div className="hero-chip">
              <strong>{docTables.length} document tables</strong>
              <div className="muted">Structured document entities.</div>
            </div>
            <div className="hero-chip">
              <strong>{docLinks.length} document relations</strong>
              <div className="muted">Cross-links into the wider model.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Tables", value: docTables.length, note: "document-centric entities" },
          { label: "Links", value: docLinks.length, note: "cross-model connections" },
          { label: "Fields", value: docTables.reduce((sum, table) => sum + table.fields.length, 0), note: "document metadata fields" }
        ]}
      />

      <section className="section-grid">
        {docTables.map((table) => (
          <article key={table.table_name} className="panel">
            <div className="page-head">
              <h2>{table.table_name}</h2>
              <p>{table.table_purpose}</p>
            </div>
            <div className="field-cloud">
              {table.fields.slice(0, 8).map((field) => (
                <span key={field.name} className="tag">
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
