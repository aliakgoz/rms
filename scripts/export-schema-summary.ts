import { getRmsRelationships, getRmsSchema } from "@/lib/rms/schema-metadata";

const schema = getRmsSchema();
const relationships = getRmsRelationships();

console.log(`Schema: ${schema.schema_name} v${schema.version}`);
console.log(`Tables: ${schema.tables.length}`);
console.log(`Relationships: ${relationships.relationships.length}`);
console.log("");

for (const table of schema.tables) {
  console.log(`${table.table_name} (${table.fields.length} fields)`);
}
