"use client";

import { useMemo, useState } from "react";
import { useRmsData } from "@/lib/rms/provider";

type Level = {
  level_code: string;
  level_name: string;
  short_definition?: string;
  detailed_explanation?: string;
};

const KIND_OPTIONS = ["functional", "performance", "constraint", "verification_requirement", "validation_requirement"];
const DOMAIN_OPTIONS = ["needs_domain", "functional_architecture_interface", "solution_domain", "implementation_documentation"];
const STATUS_OPTIONS = ["draft", "proposed", "approved", "implemented", "verified", "retired"];
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"];
const APPROVAL_OPTIONS = ["not_submitted", "under_review", "approved", "conditionally_approved", "rejected"];

export function RequirementForm({ levels }: { levels: Level[] }) {
  const { connected, createRequirementRecord } = useRmsData();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(levels[0]?.level_code || "");

  const activeLevel = useMemo(
    () => levels.find((level) => level.level_code === selectedLevel) || levels[0],
    [levels, selectedLevel]
  );

  async function onSubmit(formData: FormData) {
    setIsSaving(true);
    setMessage("");
    try {
      const requirement = await createRequirementRecord(
        Object.fromEntries(formData.entries()) as Partial<Record<string, string>>
      );
      setMessage(`${requirement.req_code} kaydedildi.`);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayit sirasinda hata olustu.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="callout">
        <strong>Yeni requirement olusturma rehberi</strong>
        <p>
          Once amaci net yazin, sonra kontrol edilebilir bir statement girin. Belirsiz ifadeler yerine olculebilir ve
          dogrulanabilir cumleler kullanin.
        </p>
        {!connected ? (
          <p className="muted">
            Kayit olusturmadan once sol menuden veya dashboard'dan DivvySync klasorunu baglayin.
          </p>
        ) : null}
        <div className="pill-row">
          <span className="tag">Ornek kod: REQ-SAF-014</span>
          <span className="tag slate">Ornek UID: UID-00014</span>
          <span className="tag warn">Yeni kayit icin durum: draft</span>
        </div>
      </div>

      <form
        className="form-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const saved = await onSubmit(new FormData(form));
          if (saved) {
            form.reset();
            setSelectedLevel(levels[0]?.level_code || "");
          }
        }}
      >
        <div className="full form-section-title">Kimlik ve kapsam</div>

        <label className="form-field">
          <span>Kod</span>
          <small>Kullanicinin gordugu requirement kodu.</small>
          <input name="req_code" placeholder="REQ-SAF-014" />
          <em>Ornek: REQ-SAF-014</em>
        </label>

        <label className="form-field">
          <span>UID</span>
          <small>Degismeyen izleme kimligi.</small>
          <input name="req_uid" placeholder="UID-00014" />
          <em>Ornek: UID-00014</em>
        </label>

        <label className="full form-field">
          <span>Baslik *</span>
          <small>Kisa, okunabilir ve tek odakli bir baslik yazin.</small>
          <input name="title" placeholder="Atik kabul sistemi sizdirmazlik durumunu izlemeli" required />
          <em>Ornek: Atik kabul sistemi sizdirmazlik durumunu izlemeli</em>
        </label>

        <label className="full form-field">
          <span>Statement *</span>
          <small>Dogrulanabilir, acik ve tek bir yukumluluk tanimlayan ifade kullanin.</small>
          <textarea
            name="statement"
            rows={5}
            required
            placeholder="Sistem normal isletim kosullarinda sizdirmazlik sinirlarini surekli izlemeli ve esik asiminda 2 saniye icinde alarm uretmelidir."
          />
          <em>Kotu ornek: Sistem guvenli olmali. Iyi ornek: Sistem esik asiminda 2 saniye icinde alarm vermelidir.</em>
        </label>

        <div className="full form-section-title">Yonetim ve siniflandirma</div>

        <label className="form-field">
          <span>Level *</span>
          <small>Requirement seviyesini secin.</small>
          <select name="level_code" value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)}>
            {levels.map((level) => (
              <option key={level.level_code} value={level.level_code}>
                {level.level_code} - {level.level_name}
              </option>
            ))}
          </select>
          <em>{activeLevel?.short_definition || "Bu seviye icin kisa tanim yok."}</em>
        </label>

        <label className="form-field">
          <span>Requirement kind *</span>
          <small>Requirement turunu secin.</small>
          <select name="requirement_kind" defaultValue="functional">
            {KIND_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <em>Davranis icin functional, limitler icin performance veya constraint tercih edilir.</em>
        </label>

        <label className="form-field">
          <span>Domain *</span>
          <small>Requirement hangi alana ait?</small>
          <select name="domain_type" defaultValue="needs_domain">
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <em>Ornek: needs_domain veya solution_domain</em>
        </label>

        <label className="form-field">
          <span>Status *</span>
          <small>Yasam dongusu durumunu secin.</small>
          <select name="status" defaultValue="draft">
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <em>Yeni kayit icin genelde draft ile baslanir.</em>
        </label>

        <label className="form-field">
          <span>Priority</span>
          <small>Oncelik seviyesi.</small>
          <select name="priority" defaultValue="medium">
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <em>Ornek: critical, high, medium, low</em>
        </label>

        <label className="form-field">
          <span>Criticality</span>
          <small>Is veya guvenlik kritikligini yazin.</small>
          <input name="criticality" defaultValue="managed" placeholder="safety_significant" />
          <em>Ornek: safety_significant</em>
        </label>

        <label className="form-field">
          <span>Approval state</span>
          <small>Onay akisi durumu.</small>
          <select name="approval_state" defaultValue="not_submitted">
            {APPROVAL_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <em>Inceleme asamasinda under_review secilebilir.</em>
        </label>

        <label className="form-field">
          <span>Effective from</span>
          <small>Gecerlilik baslangic tarihi.</small>
          <input name="effective_from" type="date" />
          <em>Zorunlu degil.</em>
        </label>

        <div className="full form-actions">
          <button className="primary" type="submit" disabled={isSaving || !connected}>
            {isSaving ? "Kaydediliyor..." : "Create Requirement"}
          </button>
          {message ? <span className="form-message">{message}</span> : null}
        </div>
      </form>
    </div>
  );
}
