"use client";

import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { useRmsData } from "@/lib/rms/provider";

export default function DecisionsPage() {
  const { db } = useRmsData();
  const decisionTables = db.schemaTables.filter(
    (table) => table.table_name.includes("decision") || table.table_name.includes("conflict")
  );
  const decisionLinks = db.relationships.filter(
    (item) =>
      item.from_table.includes("decision") ||
      item.to_table.includes("decision") ||
      item.from_table.includes("conflict") ||
      item.to_table.includes("conflict")
  );

  return (
    <>
      <PageHero
        eyebrow="Rationale"
        title="Decisions, arguments, conflicts"
        description="The RMS model keeps rationale visible instead of burying it in free text. Decision entities and conflict structures are surfaced as a dedicated control plane."
        right={
          <>
            <div className="hero-chip">
              <strong>{decisionTables.length} rationale tables</strong>
              <div className="muted">Decision and conflict metadata.</div>
            </div>
            <div className="hero-chip">
              <strong>{decisionLinks.length} rationale links</strong>
              <div className="muted">Connected to requirements and governance records.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Tables", value: decisionTables.length, note: "rationale entities" },
          { label: "Links", value: decisionLinks.length, note: "cross-domain dependencies" },
          { label: "Fields", value: decisionTables.reduce((sum, table) => sum + table.fields.length, 0), note: "decision metadata fields" }
        ]}
      />

      <section className="section-grid">
        {decisionTables.map((table) => (
          <article key={table.table_name} className="panel">
            <div className="page-head">
              <h2>{table.table_name}</h2>
              <p>{table.table_purpose}</p>
            </div>
            <div className="field-cloud">
              {table.fields.slice(0, 8).map((field) => (
                <span key={field.name} className="tag danger">
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
