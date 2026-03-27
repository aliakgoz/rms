import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function readJson<T>(fileName: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), fileName), "utf8")
  ) as T;
}

async function seedRequirementLevels() {
  const levels = readJson<Array<Record<string, unknown>>>("rms_requirement_levels_seed.json");

  for (const level of levels) {
    await prisma.requirementLevel.upsert({
      where: { levelCode: String(level.level_code) },
      update: {
        levelName: String(level.level_name),
        shortDefinition: String(level.short_definition),
        detailedExplanation: String(level.detailed_explanation),
        typicalQuestionAnswered: (level.typical_question_answered as string | undefined) ?? null,
        typicalSources: (level.typical_sources as unknown) ?? undefined,
        expectedContent: (level.expected_content as unknown) ?? undefined,
        exampleRequirements: (level.example_requirements as unknown) ?? undefined,
        databaseHint: (level.database_hint as string | undefined) ?? null,
        sortOrder: Number(level.sort_order),
        isActive: Boolean(level.is_active)
      },
      create: {
        levelCode: String(level.level_code),
        levelName: String(level.level_name),
        shortDefinition: String(level.short_definition),
        detailedExplanation: String(level.detailed_explanation),
        typicalQuestionAnswered: (level.typical_question_answered as string | undefined) ?? null,
        typicalSources: (level.typical_sources as unknown) ?? undefined,
        expectedContent: (level.expected_content as unknown) ?? undefined,
        exampleRequirements: (level.example_requirements as unknown) ?? undefined,
        databaseHint: (level.database_hint as string | undefined) ?? null,
        sortOrder: Number(level.sort_order),
        isActive: Boolean(level.is_active)
      }
    });
  }
}

async function seedLookups() {
  const schema = readJson<{
    recommended_seed_lookups: Record<string, Array<Record<string, unknown>>>;
  }>("rms_full_multitable_schema.json");

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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
