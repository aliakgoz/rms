import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { getDashboardData } from "@/lib/rms/store";

export default function DashboardPage() {
  const { db, dbPath, groupedByLevel, relationshipByTable } = getDashboardData();
  const topRelationshipTables = Object.entries(relationshipByTable).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const dominantLevels = Object.entries(groupedByLevel).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <PageHero
        eyebrow="RMS cockpit"
        title="Traceability-first workspace"
        description="The rebuilt interface again behaves like a structured RMS console: metrics, controlled records, traceability, configuration, evidence and metadata all have dedicated views."
        right={
          <>
            <div className="hero-chip">
              <strong>{db.schemaTables.length} schema tables</strong>
              <div className="muted">Loaded from the full multitable schema package.</div>
            </div>
            <div className="hero-chip">
              <strong>{db.relationships.length} table relationships</strong>
              <div className="muted">Used to drive graph and traceability views.</div>
            </div>
            <div className="hero-chip">
              <strong>{db.requirementLevels.length} requirement levels</strong>
              <div className="muted">Seeded directly from the official level catalogue.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Requirements", value: db.requirements.length, note: "controlled records" },
          { label: "Tables", value: db.schemaTables.length, note: "schema entities" },
          { label: "Relationships", value: db.relationships.length, note: "traceability edges" },
          { label: "Levels", value: db.requirementLevels.length, note: "requirement taxonomy" }
        ]}
      />

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
              <p>Shared data source used by the current runtime.</p>
            </div>
            <div className="list">
              <article className="list-card">
                <strong>Shared path</strong>
                <p className="muted"><code>{dbPath}</code></p>
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
