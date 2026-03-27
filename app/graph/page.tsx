import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { getDashboardData } from "@/lib/rms/store";

export default function GraphPage() {
  const { db } = getDashboardData();
  const largestTables = [...db.schemaTables].sort((a, b) => b.fields.length - a.fields.length).slice(0, 8);

  return (
    <>
      <PageHero
        eyebrow="Metadata graph"
        title="Schema table landscape"
        description="This is the schema-driven control surface of the RMS package. Large entities, field density and table purpose are visible in one place."
        right={
          <>
            <div className="hero-chip">
              <strong>{db.schemaTables.length} total tables</strong>
              <div className="muted">Authoritative schema entities.</div>
            </div>
            <div className="hero-chip">
              <strong>{db.relationships.length} total links</strong>
              <div className="muted">Graph edges across the schema.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Tables", value: db.schemaTables.length, note: "schema package entities" },
          { label: "Fields", value: db.schemaTables.reduce((sum, table) => sum + table.fields.length, 0), note: "aggregate field count" },
          { label: "Largest Table", value: largestTables[0]?.table_name || "-", note: `${largestTables[0]?.fields.length || 0} fields` }
        ]}
      />

      <section className="panel">
        <div className="page-head">
          <h2>Largest entities</h2>
          <p>High-density schema tables often drive the core RMS workflows.</p>
        </div>
        <div className="matrix">
          {largestTables.map((table) => (
            <div key={table.table_name} className="matrix-row">
              <div>
                <strong>{table.table_name}</strong>
                <div className="muted">{table.fields.length} fields</div>
              </div>
              <div>
                <div className="muted">{table.table_purpose}</div>
                <div className="field-cloud">
                  {table.fields.slice(0, 6).map((field) => (
                    <span key={field.name} className="tag slate">
                      {field.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Full schema table list</h2>
          <p>Complete table-level metadata from the schema package.</p>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th>Purpose</th>
                <th>Field count</th>
                <th>Example fields</th>
              </tr>
            </thead>
            <tbody>
              {db.schemaTables.map((table) => (
                <tr key={table.table_name}>
                  <td>{table.table_name}</td>
                  <td>{table.table_purpose}</td>
                  <td>{table.fields.length}</td>
                  <td>{table.fields.slice(0, 4).map((field) => field.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
