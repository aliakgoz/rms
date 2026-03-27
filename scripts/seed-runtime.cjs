const fs = require("node:fs");
const path = require("node:path");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const appRoot = process.env.RMS_APP_ROOT || process.cwd();

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(appRoot, fileName), "utf8"));
}

async function seedRequirementLevels() {
  const levels = readJson("rms_requirement_levels_seed.json");

  for (const level of levels) {
    await prisma.requirementLevel.upsert({
      where: { levelCode: String(level.level_code) },
      update: {
        levelName: String(level.level_name),
        shortDefinition: String(level.short_definition),
        detailedExplanation: String(level.detailed_explanation),
        typicalQuestionAnswered: level.typical_question_answered ?? null,
        typicalSources: level.typical_sources ?? undefined,
        expectedContent: level.expected_content ?? undefined,
        exampleRequirements: level.example_requirements ?? undefined,
        databaseHint: level.database_hint ?? null,
        sortOrder: Number(level.sort_order),
        isActive: Boolean(level.is_active)
      },
      create: {
        levelCode: String(level.level_code),
        levelName: String(level.level_name),
        shortDefinition: String(level.short_definition),
        detailedExplanation: String(level.detailed_explanation),
        typicalQuestionAnswered: level.typical_question_answered ?? null,
        typicalSources: level.typical_sources ?? undefined,
        expectedContent: level.expected_content ?? undefined,
        exampleRequirements: level.example_requirements ?? undefined,
        databaseHint: level.database_hint ?? null,
        sortOrder: Number(level.sort_order),
        isActive: Boolean(level.is_active)
      }
    });
  }
}

async function seedLookups() {
  const schema = readJson("rms_full_multitable_schema.json");

  for (const row of schema.recommended_seed_lookups.verification_methods) {
    await prisma.verificationMethod.upsert({
      where: { code: String(row.code) },
      update: { name: String(row.name), description: null, isActive: true },
      create: { code: String(row.code), name: String(row.name), description: null, isActive: true }
    });
  }

  for (const row of schema.recommended_seed_lookups.lifecycle_phases) {
    await prisma.lifecyclePhase.upsert({
      where: { phaseCode: String(row.phase_code) },
      update: {
        name: String(row.name),
        description: null,
        sortOrder: Number(row.sort_order),
        isActive: true
      },
      create: {
        phaseCode: String(row.phase_code),
        name: String(row.name),
        description: null,
        sortOrder: Number(row.sort_order),
        isActive: true
      }
    });
  }

  for (const row of schema.recommended_seed_lookups.roles) {
    await prisma.role.upsert({
      where: { roleCode: String(row.role_code) },
      update: { name: String(row.name), description: null, isActive: true },
      create: {
        roleCode: String(row.role_code),
        name: String(row.name),
        description: null,
        isActive: true
      }
    });
  }
}

async function main() {
  await seedRequirementLevels();
  await seedLookups();
}

async function runAndDisconnect() {
  try {
    await main();
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { main, runAndDisconnect };

if (require.main === module) {
  runAndDisconnect()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
