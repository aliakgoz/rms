import schemaPackage from "@/rms_full_multitable_schema.json";
import relationshipPackage from "@/rms_full_multitable_relationships.json";
import requirementLevelsSeed from "@/rms_requirement_levels_seed.json";

export const RMS_FILE_NAME = "rms-data.json";

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

export type RmsDatabase = {
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

type SchemaPackage = {
  entity_groups: EntityGroups;
  tables: SchemaTable[];
};

type RelationshipPackage = {
  relationships: Relationship[];
};

export type DatabaseSummary = {
  groupedByLevel: Record<string, number>;
  relationshipByTable: Record<string, number>;
  totalRecords: number;
};

const typedSchemaPackage = schemaPackage as SchemaPackage;
const typedRelationshipPackage = relationshipPackage as RelationshipPackage;
const typedRequirementLevels = requirementLevelsSeed as RequirementLevelSeed[];

function nowIso() {
  return new Date().toISOString();
}

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `rms-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function makeEmptyRecordsByTable(tables: SchemaTable[]) {
  return Object.fromEntries(tables.map((table) => [table.table_name, [] as GenericTableRecord[]]));
}

function hydrateRecordsByTable(
  currentRecords: unknown,
  tables: SchemaTable[],
  requirements: RequirementRecord[]
) {
  const base = makeEmptyRecordsByTable(tables);
  const raw =
    typeof currentRecords === "object" && currentRecords
      ? (currentRecords as Record<string, unknown>)
      : {};

  for (const table of tables) {
    if (Array.isArray(raw[table.table_name])) {
      base[table.table_name] = raw[table.table_name] as GenericTableRecord[];
    }
  }

  base.requirements = requirements.map((item) => ({ ...item }));
  return base;
}

export function createInitialDatabase(): RmsDatabase {
  const timestamp = nowIso();
  return {
    version: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
    requirementLevels: typedRequirementLevels,
    entityGroups: typedSchemaPackage.entity_groups,
    schemaTables: typedSchemaPackage.tables,
    relationships: typedRelationshipPackage.relationships,
    requirements: [],
    recordsByTable: makeEmptyRecordsByTable(typedSchemaPackage.tables)
  };
}

export function normalizeDatabase(input: Partial<RmsDatabase> | null | undefined): RmsDatabase {
  const base = createInitialDatabase();
  const current = input && typeof input === "object" ? input : {};
  const requirements = Array.isArray(current.requirements)
    ? (current.requirements as RequirementRecord[])
    : [];
  const recordsByTable = hydrateRecordsByTable(current.recordsByTable, base.schemaTables, requirements);

  return {
    ...base,
    ...current,
    requirementLevels: Array.isArray(current.requirementLevels)
      ? (current.requirementLevels as RequirementLevelSeed[])
      : base.requirementLevels,
    entityGroups:
      current.entityGroups && typeof current.entityGroups === "object"
        ? (current.entityGroups as EntityGroups)
        : base.entityGroups,
    schemaTables: Array.isArray(current.schemaTables)
      ? (current.schemaTables as SchemaTable[])
      : base.schemaTables,
    relationships: Array.isArray(current.relationships)
      ? (current.relationships as Relationship[])
      : base.relationships,
    requirements,
    recordsByTable
  };
}

export function summarizeDatabase(db: RmsDatabase): DatabaseSummary {
  const groupedByLevel = db.requirements.reduce<Record<string, number>>((acc, item) => {
    acc[item.level_code] = (acc[item.level_code] || 0) + 1;
    return acc;
  }, {});

  const relationshipByTable = db.relationships.reduce<Record<string, number>>((acc, rel) => {
    acc[rel.from_table] = (acc[rel.from_table] || 0) + 1;
    return acc;
  }, {});

  const totalRecords = Object.values(db.recordsByTable).reduce((sum, items) => sum + items.length, 0);
  return { groupedByLevel, relationshipByTable, totalRecords };
}

export function getSchemaTable(db: RmsDatabase, tableName: string) {
  return db.schemaTables.find((table) => table.table_name === tableName);
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

export function addRequirement(
  dbInput: RmsDatabase,
  input: Partial<RequirementRecord>
) {
  const db = normalizeDatabase(dbInput);
  const now = nowIso();
  const index = db.requirements.length + 1;
  const levelCode =
    input.level_code && db.requirementLevels.some((level) => level.level_code === input.level_code)
      ? input.level_code
      : db.requirementLevels[0]?.level_code || "L0";

  const requirement: RequirementRecord = {
    id: String(input.id || createUuid()),
    req_code: input.req_code?.toString().trim() || `REQ-${String(index).padStart(3, "0")}`,
    req_uid: input.req_uid?.toString().trim() || `UID-${String(index).padStart(5, "0")}`,
    title: input.title?.toString().trim() || "Untitled requirement",
    statement: input.statement?.toString().trim() || "",
    normalized_statement:
      input.normalized_statement?.toString().trim() || input.statement?.toString().trim() || "",
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
  db.updatedAt = now;

  return { db, requirement };
}

export function addTableRecord(
  dbInput: RmsDatabase,
  tableName: string,
  input: Record<string, unknown>
) {
  if (tableName === "requirements") {
    const result = addRequirement(dbInput, input as Partial<RequirementRecord>);
    return { db: result.db, record: result.requirement };
  }

  const db = normalizeDatabase(dbInput);
  const table = getSchemaTable(db, tableName);

  if (!table) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  const now = nowIso();
  const record: GenericTableRecord = {};

  for (const field of table.fields) {
    const provided = coerceValue(field, input[field.name]);

    if (provided !== undefined) {
      record[field.name] = provided;
      continue;
    }

    if (field.name === "id") {
      record[field.name] = createUuid();
      continue;
    }

    if (field.name === "created_at" || field.name === "updated_at") {
      record[field.name] = now;
      continue;
    }

    if (field.type === "boolean") {
      record[field.name] = field.name === "is_active";
    }
  }

  if (!db.recordsByTable[tableName]) {
    db.recordsByTable[tableName] = [];
  }

  db.recordsByTable[tableName].unshift(record);
  db.updatedAt = now;
  return { db, record };
}
