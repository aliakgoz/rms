import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { getDashboardData } from "@/lib/rms/store";

export default function SchedulePage() {
  const { db } = getDashboardData();
  const programmeTables = db.schemaTables.filter(
    (table) =>
      table.table_name.includes("phase") ||
      table.table_name.includes("milestone") ||
      table.table_name.includes("wbs") ||
      table.table_name.includes("schedule")
  );
  const programmeLinks = db.relationships.filter(
    (item) =>
      item.from_table.includes("phase") ||
      item.to_table.includes("phase") ||
      item.from_table.includes("milestone") ||
      item.to_table.includes("milestone") ||
      item.from_table.includes("wbs") ||
      item.to_table.includes("wbs") ||
      item.from_table.includes("schedule") ||
      item.to_table.includes("schedule")
  );

  return (
    <>
      <PageHero
        eyebrow="Programme integration"
        title="Schedule-linked structures"
        description="Lifecycle phases, milestones, WBS items and schedule-facing requirement structures are surfaced as part of the RMS web workspace."
        right={
          <>
            <div className="hero-chip">
              <strong>{programmeTables.length} programme tables</strong>
              <div className="muted">Detected from phase, milestone, WBS and schedule entities.</div>
            </div>
            <div className="hero-chip">
              <strong>{programmeLinks.length} programme links</strong>
              <div className="muted">Schedule-connected relationships.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Tables", value: programmeTables.length, note: "programme-facing schema entities" },
          { label: "Links", value: programmeLinks.length, note: "timeline relationships" },
          { label: "Fields", value: programmeTables.reduce((sum, table) => sum + table.fields.length, 0), note: "planning metadata fields" }
        ]}
      />

      <section className="panel">
        <div className="page-head">
          <h2>Programme tables</h2>
          <p>Lifecycle and scheduling structures drawn from the schema package.</p>
        </div>
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th>Purpose</th>
                <th>Key fields</th>
              </tr>
            </thead>
            <tbody>
              {programmeTables.map((table) => (
                <tr key={table.table_name}>
                  <td>{table.table_name}</td>
                  <td>{table.table_purpose}</td>
                  <td>{table.fields.slice(0, 3).map((field) => field.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
