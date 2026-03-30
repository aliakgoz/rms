"use client";

import { RequirementsBrowser } from "@/components/requirements/requirements-browser";
import { KpiStrip } from "@/components/rms/kpi-strip";
import { PageHero } from "@/components/rms/page-hero";
import { RequirementForm } from "@/components/requirements/requirement-form";
import { useRmsData } from "@/lib/rms/provider";

export default function RequirementsPage() {
  const { db, connected } = useRmsData();

  return (
    <>
      <PageHero
        eyebrow="Core records"
        title="Requirements register"
        description="Requirements are managed as structured records rather than loose text. New records are written directly to the locally bound rms-data.json file."
        right={
          <>
            <div className="hero-chip">
              <strong>{db.requirements.length} active records</strong>
              <div className="muted">Shared operational data.</div>
            </div>
            <div className="hero-chip">
              <strong>{db.requirementLevels.length} selectable levels</strong>
              <div className="muted">Directly sourced from the seed catalogue.</div>
            </div>
            <div className="hero-chip">
              <strong>{connected ? "Write-ready" : "Folder not connected"}</strong>
              <div className="muted">Bind the DivvySync folder before saving.</div>
            </div>
          </>
        }
      />

      <KpiStrip
        items={[
          { label: "Records", value: db.requirements.length, note: "current requirement count" },
          { label: "Levels", value: db.requirementLevels.length, note: "controlled taxonomy" },
          { label: "Draft", value: db.requirements.filter((item) => item.status === "draft").length, note: "open drafting" }
        ]}
      />

      <section className="page-grid">
        <div className="panel">
          <div className="page-head">
            <h2>Create Requirement</h2>
            <p>Yeni requirement kaydi icin rehberli, aciklamali ve ornekli form.</p>
          </div>
          <RequirementForm levels={db.requirementLevels} />
        </div>

        <div className="panel">
          <div className="page-head">
            <h2>Requirement Writing Guide</h2>
            <p>Ilk kaydi girerken kullanicinin hata yapmasini azaltan hizli hatirlaticilar.</p>
          </div>
          <div className="list">
            <article className="list-card">
              <strong>Iyi requirement ipuclari</strong>
              <p className="muted">Tek bir davranis veya kisit tanimlayin, olculebilir ifade kullanin, yoruma acik kelimelerden kacinin.</p>
              <div className="meta">
                <span className="tag">measurable</span>
                <span className="tag slate">testable</span>
                <span className="tag warn">single-purpose</span>
              </div>
            </article>
            {db.requirementLevels.slice(0, 5).map((level) => (
              <article key={level.level_code} className="list-card">
                <strong>{level.level_code} - {level.level_name}</strong>
                <p className="muted">{level.short_definition}</p>
                <div className="meta">
                  <span className="tag slate">taxonomy</span>
                  {level.database_hint ? <span className="tag">db hint</span> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Records Browser</h2>
          <p>Search, filter and scan structured requirement records.</p>
        </div>
        <RequirementsBrowser requirements={db.requirements} levels={db.requirementLevels} />
      </section>
    </>
  );
}
