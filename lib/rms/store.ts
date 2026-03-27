import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_SHARED_ROOT =
  "C:\\Users\\RAYK\\DivvySync\\Ortak Klas\u00f6r\\14-RAYK\\01-YYBT\\15-Requirement Management System (RMS)\\01-Veritaban\u0131 ve aray\u00fcz deneme klas\u00f6r\u00fc";

export type RequirementLevelSeed = {
  level_code: string;
  level_name: string;
  short_definition: string;
  detailed_explanation: string;
  database_hint?: string | null;
};

export type SchemaField = {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
};

export type SchemaTable = {
  table_name: string;
  table_purpose: string;
  primary_key?: string;
  fields: SchemaField[];
};

export type Relationship = {
  from_table: string;
  from_field: string;
  to_table: string;
  to_field: string;
  cardinality: string;
  description: string;
};

export type RequirementRecord = {
  id: string;
  req_code: string;
  req_uid: string;
  title: string;
  statement: string;
  level_code: string;
  requirement_kind: string;
  domain_type: string;
  status: string;
  priority: string;
  criticality: string;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type EntityGroups = Record<string, string[]>;
export type GenericTableRecord = Record<string, unknown>;

type SchemaPackage = {
  entity_groups: EntityGroups;
  tables: SchemaTable[];
};

type RelationshipPackage = {
  relationships: Relationship[];
};

type RmsDatabase = {
  version: number;
  createdAt: string;
  updatedAt: string;
  requirementLevels: RequirementLevelSeed[];
  entityGroups: EntityGroups;
  schemaTables: SchemaTable[];
  relationships: Relationship[];
  requirements: RequirementRecord[];
  recordsByTable: Record<string, GenericTableRecord[]>;
};

function appRoot() {
  return process.cwd();
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getSettingsPath() {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || process.cwd(), "AppData", "Roaming");
  return path.join(appData, "rms-desktop", "rms-desktop.json");
}

function resolveSharedRoot() {
  const settingsPath = getSettingsPath();
  if (fs.existsSync(settingsPath)) {
    const settings = readJson<{ databaseFolder?: string }>(settingsPath);
    if (settings.databaseFolder) {
      fs.mkdirSync(settings.databaseFolder, { recursive: true });
      return settings.databaseFolder;
    }
  }

  fs.mkdirSync(DEFAULT_SHARED_ROOT, { recursive: true });
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeJson(settingsPath, { databaseFolder: DEFAULT_SHARED_ROOT });
  return DEFAULT_SHARED_ROOT;
}

function loadSchemaPackage() {
  return readJson<SchemaPackage>(path.join(appRoot(), "rms_full_multitable_schema.json"));
}

function loadRelationshipPackage() {
  return readJson<RelationshipPackage>(path.join(appRoot(), "rms_full_multitable_relationships.json"));
}

function makeEmptyRecordsByTable(tables: SchemaTable[]) {
  return Object.fromEntries(tables.map((table) => [table.table_name, [] as GenericTableRecord[]]));
}

function coerceValue(field: SchemaField, raw: unknown) {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    if (field.type === "boolean") {
      return trimmed === "true";
    }

    return trimmed;
  }

  if (field.type === "boolean") {
    return Boolean(raw);
  }

  return raw;
}

function hydrateRecordsByTable(
  currentRecords: unknown,
  tables: SchemaTable[],
  requirements: RequirementRecord[]
) {
  const base = makeEmptyRecordsByTable(tables);
  const raw = typeof currentRecords === "object" && currentRecords ? currentRecords as Record<string, unknown> : {};

  for (const table of tables) {
    if (Array.isArray(raw[table.table_name])) {
      base[table.table_name] = raw[table.table_name] as GenericTableRecord[];
    }
  }

  if (requirements.length > 0) {
    base.requirements = requirements.map((item) => ({ ...item }));
  }

  return base;
}

function initialDatabase(): RmsDatabase {
  const requirementLevels = readJson<RequirementLevelSeed[]>(path.join(appRoot(), "rms_requirement_levels_seed.json"));
  const schema = loadSchemaPackage();
  const relationships = loadRelationshipPackage();

  return {
    version: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requirementLevels,
    entityGroups: schema.entity_groups,
    schemaTables: schema.tables,
    relationships: relationships.relationships,
    requirements: [],
    recordsByTable: makeEmptyRecordsByTable(schema.tables)
  };
}

export function getDatabasePath() {
  return path.join(resolveSharedRoot(), "rms-data.json");
}

export function ensureDatabase() {
  const dbPath = getDatabasePath();
  if (!fs.existsSync(dbPath)) {
    writeJson(dbPath, initialDatabase());
  }
  return dbPath;
}

export function readDatabase() {
  const dbPath = ensureDatabase();
  const current = readJson<Partial<RmsDatabase> & Record<string, unknown>>(dbPath);
  const base = initialDatabase();
  const requirements = Array.isArray(current.requirements) ? current.requirements as RequirementRecord[] : [];
  const recordsByTable = hydrateRecordsByTable(current.recordsByTable, base.schemaTables, requirements);

  const merged: RmsDatabase = {
    ...base,
    ...current,
    requirementLevels: Array.isArray(current.requirementLevels) ? current.requirementLevels as RequirementLevelSeed[] : base.requirementLevels,
    entityGroups: current.entityGroups && typeof current.entityGroups === "object"
      ? current.entityGroups as EntityGroups
      : base.entityGroups,
    schemaTables: Array.isArray(current.schemaTables) ? current.schemaTables as SchemaTable[] : base.schemaTables,
    relationships: Array.isArray(current.relationships) ? current.relationships as Relationship[] : base.relationships,
    requirements,
    recordsByTable
  };

  if (!Array.isArray(current.schemaTables) || !Array.isArray(current.relationships) || !current.recordsByTable) {
    writeJson(dbPath, merged);
  }

  return merged;
}

export function writeDatabase(db: RmsDatabase) {
  db.updatedAt = new Date().toISOString();
  writeJson(ensureDatabase(), db);
}

export function getSchemaTable(tableName: string) {
  return readDatabase().schemaTables.find((table) => table.table_name === tableName);
}

export function createRequirement(input: Partial<RequirementRecord>) {
  const db = readDatabase();
  const now = new Date().toISOString();
  const index = db.requirements.length + 1;
  const levelCode = input.level_code && db.requirementLevels.some((level) => level.level_code === input.level_code)
    ? input.level_code
    : db.requirementLevels[0]?.level_code || "L0";

  const requirement: RequirementRecord = {
    id: String(input.id || crypto.randomUUID()),
    req_code: input.req_code?.toString().trim() || `REQ-${String(index).padStart(3, "0")}`,
    req_uid: input.req_uid?.toString().trim() || `UID-${String(index).padStart(5, "0")}`,
    title: input.title?.toString().trim() || "Untitled requirement",
    statement: input.statement?.toString().trim() || "",
    normalized_statement: input.normalized_statement?.toString().trim() || input.statement?.toString().trim() || "",
    level_code: levelCode,
    requirement_kind: input.requirement_kind?.toString().trim() || "functional",
    domain_type: input.domain_type?.toString().trim() || "programme",
    status: input.status?.toString().trim() || "draft",
    priority: input.priority?.toString().trim() || "medium",
    criticality: input.criticality?.toString().trim() || "managed",
    safety_significance: input.safety_significance?.toString().trim() || "",
    security_class: input.security_class?.toString().trim() || "",
    approval_state: input.approval_state?.toString().trim() || "not_submitted",
    lifecycle_phase_id: input.lifecycle_phase_id?.toString().trim() || "",
    owner_org_id: input.owner_org_id?.toString().trim() || "",
    responsible_role_id: input.responsible_role_id?.toString().trim() || "",
    current_revision_id: input.current_revision_id?.toString().trim() || "",
    effective_from: input.effective_from?.toString().trim() || "",
    effective_to: input.effective_to?.toString().trim() || "",
    is_active: input.is_active === false ? false : true,
    created_at: now,
    updated_at: now
  };

  db.requirements.unshift(requirement);
  db.recordsByTable.requirements = db.requirements.map((item) => ({ ...item }));
  writeDatabase(db);
  return requirement;
}

export function createTableRecord(tableName: string, input: Record<string, unknown>) {
  if (tableName === "requirements") {
    return createRequirement(input as Partial<RequirementRecord>);
  }

  const db = readDatabase();
  const table = db.schemaTables.find((item) => item.table_name === tableName);

  if (!table) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  const now = new Date().toISOString();
  const record: GenericTableRecord = {};

  for (const field of table.fields) {
    const provided = coerceValue(field, input[field.name]);

    if (provided !== undefined) {
      record[field.name] = provided;
      continue;
    }

    if (field.name === "id") {
      record[field.name] = crypto.randomUUID();
      continue;
    }

    if (field.name === "created_at" || field.name === "updated_at") {
      record[field.name] = now;
      continue;
    }

    if (field.type === "boolean") {
      record[field.name] = field.name === "is_active";
      continue;
    }
  }

  if (!db.recordsByTable[tableName]) {
    db.recordsByTable[tableName] = [];
  }

  db.recordsByTable[tableName].unshift(record);
  writeDatabase(db);
  return record;
}

export function getDashboardData() {
  const db = readDatabase();
  const groupedByLevel = db.requirements.reduce<Record<string, number>>((acc, item) => {
    acc[item.level_code] = (acc[item.level_code] || 0) + 1;
    return acc;
  }, {});
  const relationshipByTable = db.relationships.reduce<Record<string, number>>((acc, rel) => {
    acc[rel.from_table] = (acc[rel.from_table] || 0) + 1;
    return acc;
  }, {});

  return { dbPath: ensureDatabase(), db, groupedByLevel, relationshipByTable };
}
