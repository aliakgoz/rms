"use client";

import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { SchemaWorkbench } from "@/components/workbench/schema-workbench";
import { useRmsData, useRmsSummary } from "@/lib/rms/provider";

export default function WorkbenchPage() {
  const { db, connected } = useRmsData();
  const { totalRecords } = useRmsSummary();

  return (
    <>
      <PageHero
        eyebrow="Data entry"
        title="Schema workbench"
        description="Tum JSON tablo gruplari ve iliskiler bu ekranda kullanici dostu veri giris akisina baglandi. Kayitlar secili yerel rms-data.json dosyasina yazilir."
        right={
          <>
            <div className="hero-chip">
              <strong>{db.schemaTables.length} schema tables</strong>
              <div className="muted">Authoritative package loaded.</div>
            </div>
            <div className="hero-chip">
              <strong>{db.relationships.length} relationships</strong>
              <div className="muted">Lookup and linking hints active.</div>
            </div>
            <div className="hero-chip">
              <strong>{connected ? `${totalRecords} stored records` : "Connect folder to write"}</strong>
              <div className="muted">Across all table buckets.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Entity Groups", value: Object.keys(db.entityGroups).length, note: "schema-aligned areas" },
          { label: "Tables", value: db.schemaTables.length, note: "entry-ready structures" },
          { label: "Relationships", value: db.relationships.length, note: "mapped links" }
        ]}
      />

      <SchemaWorkbench
        entityGroups={db.entityGroups}
        schemaTables={db.schemaTables}
        relationships={db.relationships}
        recordsByTable={db.recordsByTable}
      />
    </>
  );
}
