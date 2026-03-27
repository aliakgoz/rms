"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EntityGroups, GenericTableRecord, Relationship, SchemaField, SchemaTable } from "@/lib/rms/store";

type Props = {
  entityGroups: EntityGroups;
  schemaTables: SchemaTable[];
  relationships: Relationship[];
  recordsByTable: Record<string, GenericTableRecord[]>;
};

const AUTO_FIELDS = new Set(["id", "created_at", "updated_at"]);

function prettify(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function exampleForField(field: SchemaField, tableName: string) {
  const examples: Record<string, string> = {
    req_code: "REQ-SAF-014",
    req_uid: "UID-00014",
    title: tableName === "requirements" ? "Atik kabul sistemi sizdirmazlik durumunu izlemeli" : "Belge veya kayit basligi",
    statement: "Sistem alarm esigini 2 saniye icinde tetiklemelidir.",
    normalized_statement: "Sistem alarm esigini 2 saniye icinde tetiklemelidir.",
    requirement_kind: "functional",
    domain_type: "needs_domain",
    status: "draft",
    priority: "high",
    criticality: "safety_significant",
    approval_state: "under_review",
    doc_code: "DOC-TR-001",
    doc_type: "procedure",
    verification_title: "Sizdirmazlik fonksiyon testi",
    acceptance_criteria: "Tum alarm seviyeleri kabul sinirlarinda dogrulanmali.",
    cr_code: "CR-2026-004",
    description: "Yeni saha verisi nedeniyle degisiklik onerisi.",
    reason_type: "design_change",
    file_uri: "\\\\ortak\\dokumanlar\\test-raporu.pdf",
    issue_date: "2026-03-27"
  };

  return examples[field.name] || field.description || `${prettify(field.name)} girin`;
}

function recordLabel(record: GenericTableRecord) {
  const candidates = ["title", "name", "req_code", "doc_code", "cr_code", "verification_title", "level_name", "id"];
  const found = candidates.find((key) => typeof record[key] === "string" && String(record[key]).trim().length > 0);
  return found ? String(record[found]) : "Kayit";
}

function stringifyRecordValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export function SchemaWorkbench({ entityGroups, schemaTables, relationships, recordsByTable }: Props) {
  const router = useRouter();
  const groupEntries = Object.entries(entityGroups);
  const [selectedGroup, setSelectedGroup] = useState(groupEntries[0]?.[0] || "");
  const [selectedTable, setSelectedTable] = useState(groupEntries[0]?.[1]?.[0] || "requirements");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const tablesInGroup = entityGroups[selectedGroup] || [];
  const currentTable = schemaTables.find((table) => table.table_name === selectedTable) || schemaTables[0];
  const currentRecords = currentTable ? (recordsByTable[currentTable.table_name] || []) : [];
  const editableFields = currentTable ? currentTable.fields.filter((field) => !AUTO_FIELDS.has(field.name)) : [];
  const outboundRelationships = currentTable ? relationships.filter((rel) => rel.from_table === currentTable.table_name) : [];

  const relationMap = useMemo(() => {
    const entries = new Map<string, Relationship>();
    for (const rel of outboundRelationships) {
      entries.set(rel.from_field, rel);
    }
    return entries;
  }, [outboundRelationships]);

  async function submit(formData: FormData) {
    if (!currentTable) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch(`/api/records/${currentTable.table_name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Kayit olusturulamadi.");
      }

      setMessage(`${prettify(currentTable.table_name)} kaydi olusturuldu.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayit sirasinda hata olustu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="workbench">
      <aside className="panel workbench-sidebar">
        <div className="page-head">
          <h2>Table Groups</h2>
          <p>JSON schema package icindeki tum tablo gruplari.</p>
        </div>
        <div className="stack">
          {groupEntries.map(([groupName, tableNames]) => (
            <button
              key={groupName}
              type="button"
              className={`group-button${groupName === selectedGroup ? " active" : ""}`}
              onClick={() => {
                setSelectedGroup(groupName);
                setSelectedTable(tableNames[0] || "");
              }}
            >
              <strong>{prettify(groupName)}</strong>
              <span>{tableNames.length} tablo</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="stack">
        <section className="panel">
          <div className="page-head">
            <h2>{prettify(selectedGroup)}</h2>
            <p>Tablo secin, amacini okuyun ve formu kullanarak ortak veri dosyasina yeni kayit ekleyin.</p>
          </div>
          <div className="pill-row">
            {tablesInGroup.map((tableName) => (
              <button
                key={tableName}
                type="button"
                className={`chip-button${tableName === selectedTable ? " active" : ""}`}
                onClick={() => setSelectedTable(tableName)}
              >
                {prettify(tableName)}
              </button>
            ))}
          </div>
        </section>

        {currentTable ? (
          <>
            <section className="spotlight-grid">
              <div className="panel">
                <div className="page-head">
                  <h2>{prettify(currentTable.table_name)}</h2>
                  <p>{currentTable.table_purpose}</p>
                </div>
                <div className="analytics-grid">
                  <article className="analytics-card">
                    <strong>{editableFields.length}</strong>
                    <div className="muted">girilebilir alan</div>
                  </article>
                  <article className="analytics-card">
                    <strong>{outboundRelationships.length}</strong>
                    <div className="muted">dis iliski</div>
                  </article>
                  <article className="analytics-card">
                    <strong>{currentRecords.length}</strong>
                    <div className="muted">mevcut kayit</div>
                  </article>
                </div>
              </div>

              <div className="panel">
                <div className="page-head">
                  <h2>Auto-generated fields</h2>
                  <p>Bu alanlar kullanicidan istenmez, sistem otomatik olusturur.</p>
                </div>
                <div className="pill-row">
                  {currentTable.fields.filter((field) => AUTO_FIELDS.has(field.name)).map((field) => (
                    <span key={field.name} className="tag slate">{field.name}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="page-head">
                <h2>User-friendly record entry</h2>
                <p>Alan aciklamalari, ornekler ve bagli kayit secimleri ile form doldurabilirsiniz.</p>
              </div>
              <form
                key={currentTable.table_name}
                className="form-grid"
                action={async (formData) => {
                  await submit(formData);
                }}
              >
                {editableFields.map((field) => {
                  const relation = relationMap.get(field.name);
                  const relatedOptions = relation ? recordsByTable[relation.to_table] || [] : [];
                  const isLongText = field.type === "text";
                  const isBoolean = field.type === "boolean";
                  const inputType = field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "text";

                  return (
                    <label key={field.name} className={isLongText ? "full form-field" : "form-field"}>
                      <span>{prettify(field.name)} {field.required ? "*" : ""}</span>
                      <small>{field.description || "Bu alan icin aciklama yok."}</small>

                      {relation && relatedOptions.length > 0 ? (
                        <select name={field.name} defaultValue="">
                          <option value="">Seciniz</option>
                          {relatedOptions.map((record, index) => (
                            <option key={`${field.name}-${index}`} value={String(record[relation.to_field] || "")}>
                              {recordLabel(record)}
                            </option>
                          ))}
                        </select>
                      ) : isBoolean ? (
                        <select name={field.name} defaultValue={field.name === "is_active" ? "true" : "false"}>
                          <option value="true">Evet</option>
                          <option value="false">Hayir</option>
                        </select>
                      ) : isLongText ? (
                        <textarea name={field.name} rows={4} required={field.required} placeholder={exampleForField(field, currentTable.table_name)} />
                      ) : (
                        <input name={field.name} type={inputType} required={field.required} placeholder={exampleForField(field, currentTable.table_name)} />
                      )}

                      <em>{relation ? `${prettify(relation.to_table)} tablosuna baglanir.` : `Ornek: ${exampleForField(field, currentTable.table_name)}`}</em>
                    </label>
                  );
                })}

                <div className="full form-actions">
                  <button className="primary" type="submit" disabled={isSaving}>
                    {isSaving ? "Kaydediliyor..." : `${prettify(currentTable.table_name)} kaydi olustur`}
                  </button>
                  {message ? <span className="form-message">{message}</span> : null}
                </div>
              </form>
            </section>

            <section className="split">
              <div className="panel">
                <div className="page-head">
                  <h2>Table relationships</h2>
                  <p>Secili tablonun diger tablolara acilan baglari.</p>
                </div>
                <div className="relation-flow">
                  {outboundRelationships.length === 0 ? (
                    <div className="empty-state">Bu tablo icin tanimli dis iliski yok.</div>
                  ) : (
                    outboundRelationships.map((rel) => (
                      <article key={`${rel.from_field}-${rel.to_table}`} className="relation-row">
                        <div>
                          <strong>{rel.from_field}</strong>
                          <div className="muted">{prettify(rel.from_table)}</div>
                        </div>
                        <div className="relation-arrow">{rel.cardinality}</div>
                        <div>
                          <strong>{rel.to_table}</strong>
                          <div className="muted">{rel.description}</div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="page-head">
                  <h2>Recent records</h2>
                  <p>Secili tabloda kaydedilen son kayitlar.</p>
                </div>
                <div className="list">
                  {currentRecords.slice(0, 6).map((record, index) => (
                    <article key={`${currentTable.table_name}-${index}`} className="list-card">
                      <strong>{recordLabel(record)}</strong>
                      <div className="meta">
                        {currentTable.fields.slice(0, 3).map((field) => (
                          <span key={field.name} className="tag">
                            {field.name}: {stringifyRecordValue(record[field.name])}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                  {currentRecords.length === 0 ? <div className="empty-state">Bu tabloda henuz kayit yok.</div> : null}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
