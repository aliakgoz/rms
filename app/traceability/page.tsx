"use client";

import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { useRmsData } from "@/lib/rms/provider";

export default function TraceabilityPage() {
  const { db } = useRmsData();
  const requirementRels = db.relationships.filter((item) => item.from_table.includes("requirement"));
  const uniqueTargets = Array.from(new Set(requirementRels.map((item) => item.to_table)));
  const directCoverage = Math.round((uniqueTargets.length / Math.max(db.schemaTables.length, 1)) * 100);
  const strongestLinks = requirementRels.slice(0, 8);

  return (
    <>
      <PageHero
        eyebrow="Network view"
        title="Traceability map"
        description="Requirement-centric links are surfaced as a working network rather than a passive schema dump. Coverage, route density and direct downstream entities are visible together."
        right={
          <>
            <div className="hero-chip">
              <strong>{requirementRels.length} requirement-origin links</strong>
              <div className="muted">Directly sourced from the relationships package.</div>
            </div>
            <div className="hero-chip">
              <strong>{uniqueTargets.length} downstream entities</strong>
              <div className="muted">Connected from requirement tables.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Routes", value: requirementRels.length, note: "requirement-driven edges" },
          { label: "Targets", value: uniqueTargets.length, note: "reachable tables" },
          { label: "Coverage", value: `${directCoverage}%`, note: "of schema touched directly" }
        ]}
      />

      <section className="spotlight-grid">
        <div className="panel">
          <div className="page-head">
            <h2>Direct trace routes</h2>
            <p>Primary requirement paths into verification, documents, baselines and linked control entities.</p>
          </div>
          <div className="relation-flow">
            {strongestLinks.map((rel) => (
              <article key={`${rel.from_table}-${rel.from_field}-${rel.to_table}`} className="relation-row">
                <div>
                  <strong>{rel.from_table}</strong>
                  <div className="muted">{rel.from_field}</div>
                </div>
                <div className="relation-arrow">{rel.cardinality}</div>
                <div>
                  <strong>{rel.to_table}</strong>
                  <div className="muted">{rel.description}</div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="page-head">
              <h2>Connected entities</h2>
              <p>Tables touched directly by requirement routes.</p>
            </div>
            <div className="pill-row">
              {uniqueTargets.map((table) => (
                <span key={table} className="tag">
                  {table}
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="page-head">
              <h2>Traceability posture</h2>
              <p>Quick reading of the current metadata graph.</p>
            </div>
            <div className="analytics-grid">
              <article className="analytics-card">
                <strong>{db.relationships.filter((item) => item.to_table.includes("verification")).length}</strong>
                <div className="muted">verification-facing links</div>
              </article>
              <article className="analytics-card">
                <strong>{db.relationships.filter((item) => item.to_table.includes("document")).length}</strong>
                <div className="muted">document-facing links</div>
              </article>
              <article className="analytics-card">
                <strong>{db.relationships.filter((item) => item.to_table.includes("baseline")).length}</strong>
                <div className="muted">baseline-facing links</div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Full relationship table</h2>
          <p>Detailed requirement-origin relationship rows from the metadata package.</p>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>Field</th>
                <th>To</th>
                <th>Cardinality</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {requirementRels.map((rel) => (
                <tr key={`${rel.from_table}-${rel.from_field}-${rel.to_table}`}>
                  <td>{rel.from_table}</td>
                  <td>{rel.from_field}</td>
                  <td>{rel.to_table}</td>
                  <td>{rel.cardinality}</td>
                  <td>{rel.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
