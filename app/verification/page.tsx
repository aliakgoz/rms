import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { getDashboardData } from "@/lib/rms/store";

export default function VerificationPage() {
  const { db } = getDashboardData();
  const verificationTables = db.schemaTables.filter(
    (table) => table.table_name.includes("verification") || table.table_name.includes("validation")
  );
  const verificationRelationships = db.relationships.filter(
    (item) => item.from_table.includes("verification") || item.to_table.includes("verification")
  );

  return (
    <>
      <PageHero
        eyebrow="Compliance evidence"
        title="Verification and validation model"
        description="Evidence management is treated as a first-class RMS domain. Verification tables, linkage density and field footprints are shown together."
        right={
          <>
            <div className="hero-chip">
              <strong>{verificationTables.length} verification tables</strong>
              <div className="muted">Detected from the schema package.</div>
            </div>
            <div className="hero-chip">
              <strong>{verificationRelationships.length} connected relations</strong>
              <div className="muted">Verification-touching links in the model.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Tables", value: verificationTables.length, note: "verification and validation entities" },
          { label: "Fields", value: verificationTables.reduce((sum, table) => sum + table.fields.length, 0), note: "total field footprint" },
          { label: "Links", value: verificationRelationships.length, note: "adjacent relations" }
        ]}
      />

      <section className="section-grid">
        {verificationTables.map((table) => (
          <article key={table.table_name} className="panel">
            <div className="page-head">
              <h2>{table.table_name}</h2>
              <p>{table.table_purpose}</p>
            </div>
            <div className="meta">
              <span className="tag">{table.fields.length} fields</span>
              <span className="tag slate">
                {verificationRelationships.filter((item) => item.from_table === table.table_name || item.to_table === table.table_name).length} links
              </span>
            </div>
            <div className="field-cloud">
              {table.fields.slice(0, 8).map((field) => (
                <span key={field.name} className="tag warn">
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
