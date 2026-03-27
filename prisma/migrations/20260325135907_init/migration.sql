-- CreateEnum
CREATE TYPE "ManagedObjectType" AS ENUM ('requirement', 'requirement_revision', 'constraint', 'system_element', 'verification_case', 'document', 'decision', 'change_request', 'baseline');

-- CreateTable
CREATE TABLE "requirement_levels" (
    "level_code" TEXT NOT NULL,
    "level_name" TEXT NOT NULL,
    "short_definition" TEXT NOT NULL,
    "detailed_explanation" TEXT NOT NULL,
    "typical_question_answered" TEXT,
    "typical_sources" JSONB,
    "expected_content" JSONB,
    "example_requirements" JSONB,
    "database_hint" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "requirement_levels_pkey" PRIMARY KEY ("level_code")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" UUID NOT NULL,
    "req_uid" TEXT NOT NULL,
    "req_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "normalized_statement" TEXT,
    "requirement_kind" TEXT NOT NULL,
    "level_code" TEXT NOT NULL,
    "domain_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "criticality" TEXT,
    "safety_significance" TEXT,
    "security_class" TEXT,
    "lifecycle_phase_id" UUID,
    "owner_org_id" UUID,
    "responsible_role_id" UUID,
    "approval_state" TEXT,
    "effective_from" DATE,
    "effective_to" DATE,
    "current_revision_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_attributes" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "attribute_name" TEXT NOT NULL,
    "attribute_type" TEXT NOT NULL,
    "attribute_value_text" TEXT,
    "attribute_value_number" DECIMAL(18,6),
    "attribute_value_unit" TEXT,
    "attribute_value_date" DATE,
    "attribute_value_boolean" BOOLEAN,
    "source_revision_id" UUID,
    "notes" TEXT,

    CONSTRAINT "requirement_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_sources" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "source_document_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_locator" TEXT,
    "quoted_text" TEXT,
    "interpretation_note" TEXT,
    "is_primary_source" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "requirement_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_relationships" (
    "id" UUID NOT NULL,
    "from_requirement_id" UUID NOT NULL,
    "to_requirement_id" UUID NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "relationship_strength" TEXT,
    "rationale" TEXT,
    "created_in_change_id" UUID,

    CONSTRAINT "requirement_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_elements" (
    "id" UUID NOT NULL,
    "element_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "element_type" TEXT NOT NULL,
    "parent_element_id" UUID,
    "lifecycle_phase_id" UUID,
    "description" TEXT,
    "status" TEXT,

    CONSTRAINT "system_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_element_interfaces" (
    "id" UUID NOT NULL,
    "from_element_id" UUID NOT NULL,
    "to_element_id" UUID NOT NULL,
    "interface_type" TEXT NOT NULL,
    "description" TEXT,
    "governing_requirement_id" UUID,

    CONSTRAINT "system_element_interfaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_allocations" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "allocated_to_element_id" UUID NOT NULL,
    "allocation_type" TEXT NOT NULL,
    "allocated_function" TEXT,
    "allocated_characteristic" TEXT,
    "target_value" DECIMAL(18,6),
    "target_unit" TEXT,
    "allocation_rationale" TEXT,
    "allocation_status" TEXT,

    CONSTRAINT "requirement_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraints" (
    "id" UUID NOT NULL,
    "constraint_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "constraint_type" TEXT NOT NULL,
    "source_document_id" UUID,
    "status" TEXT NOT NULL,
    "owner_org_id" UUID,
    "current_revision_id" UUID,

    CONSTRAINT "constraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraint_impacts" (
    "id" UUID NOT NULL,
    "constraint_id" UUID NOT NULL,
    "requirement_id" UUID,
    "system_element_id" UUID,
    "impact_type" TEXT NOT NULL,
    "impact_description" TEXT NOT NULL,
    "severity" TEXT,
    "decision_needed_flag" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "constraint_impacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_methods" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "verification_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_cases" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "system_element_id" UUID,
    "verification_method_id" UUID NOT NULL,
    "verification_title" TEXT NOT NULL,
    "acceptance_criteria" TEXT NOT NULL,
    "planned_phase_id" UUID,
    "responsible_org_id" UUID,
    "status" TEXT NOT NULL,
    "due_date" DATE,

    CONSTRAINT "verification_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_evidence" (
    "id" UUID NOT NULL,
    "verification_case_id" UUID NOT NULL,
    "evidence_document_id" UUID NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "result_summary" TEXT,
    "result_status" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "review_date" DATE,

    CONSTRAINT "verification_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_cases" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "validation_question" TEXT NOT NULL,
    "stakeholder_basis" TEXT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence_document_id" UUID,

    CONSTRAINT "validation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" UUID NOT NULL,
    "cr_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason_type" TEXT NOT NULL,
    "initiator_org_id" UUID,
    "date_raised" DATE NOT NULL,
    "priority" TEXT,
    "impact_summary" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_request_items" (
    "id" UUID NOT NULL,
    "change_request_id" UUID NOT NULL,
    "object_type" "ManagedObjectType" NOT NULL,
    "object_id" UUID NOT NULL,
    "proposed_action" TEXT NOT NULL,
    "item_notes" TEXT,

    CONSTRAINT "change_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_revisions" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "revision_no" TEXT NOT NULL,
    "revision_status" TEXT NOT NULL,
    "statement_snapshot" TEXT NOT NULL,
    "rationale_snapshot" TEXT,
    "change_request_id" UUID,
    "supersedes_revision_id" UUID,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "baseline_id" UUID,

    CONSTRAINT "requirement_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baselines" (
    "id" UUID NOT NULL,
    "baseline_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase_id" UUID,
    "frozen_at" TIMESTAMP(3),
    "approved_by" TEXT,

    CONSTRAINT "baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baseline_items" (
    "id" UUID NOT NULL,
    "baseline_id" UUID NOT NULL,
    "object_type" "ManagedObjectType" NOT NULL,
    "object_id" UUID NOT NULL,

    CONSTRAINT "baseline_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "decision_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "decision_statement" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "decision_date" DATE,
    "owner_org_id" UUID,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_requirements" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "usage_type" TEXT NOT NULL,

    CONSTRAINT "decision_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_arguments" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "argument_type" TEXT NOT NULL,
    "argument_text" TEXT NOT NULL,
    "linked_document_id" UUID,
    "confidence_level" TEXT,

    CONSTRAINT "decision_arguments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_conflicts" (
    "id" UUID NOT NULL,
    "requirement_id_1" UUID NOT NULL,
    "requirement_id_2" UUID NOT NULL,
    "conflict_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "identified_in_review_id" UUID,
    "resolution_decision_id" UUID,
    "status" TEXT NOT NULL,

    CONSTRAINT "requirement_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "doc_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "revision" TEXT,
    "status" TEXT,
    "owner_org_id" UUID,
    "issue_date" DATE,
    "file_uri" TEXT,
    "classification" TEXT,
    "archived_flag" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "linked_object_type" "ManagedObjectType" NOT NULL,
    "linked_object_id" UUID NOT NULL,
    "link_type" TEXT NOT NULL,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_phases" (
    "id" UUID NOT NULL,
    "phase_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lifecycle_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "milestone_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "planned_date" DATE,
    "actual_date" DATE,
    "phase_id" UUID,
    "description" TEXT,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wbs_items" (
    "id" UUID NOT NULL,
    "wbs_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_wbs_id" UUID,
    "phase_id" UUID,
    "description" TEXT,

    CONSTRAINT "wbs_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_schedule_links" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "milestone_id" UUID,
    "wbs_item_id" UUID,
    "needed_by_date" DATE,
    "link_type" TEXT NOT NULL,

    CONSTRAINT "requirement_schedule_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "org_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "org_type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "role_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibilities" (
    "id" UUID NOT NULL,
    "object_type" "ManagedObjectType" NOT NULL,
    "object_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "responsibility_type" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "requirements_req_uid_key" ON "requirements"("req_uid");

-- CreateIndex
CREATE UNIQUE INDEX "requirements_req_code_key" ON "requirements"("req_code");

-- CreateIndex
CREATE UNIQUE INDEX "requirements_current_revision_id_key" ON "requirements"("current_revision_id");

-- CreateIndex
CREATE INDEX "requirements_level_code_idx" ON "requirements"("level_code");

-- CreateIndex
CREATE INDEX "requirements_requirement_kind_idx" ON "requirements"("requirement_kind");

-- CreateIndex
CREATE INDEX "requirements_status_idx" ON "requirements"("status");

-- CreateIndex
CREATE INDEX "requirements_owner_org_id_idx" ON "requirements"("owner_org_id");

-- CreateIndex
CREATE INDEX "requirements_lifecycle_phase_id_idx" ON "requirements"("lifecycle_phase_id");

-- CreateIndex
CREATE INDEX "requirement_attributes_requirement_id_idx" ON "requirement_attributes"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_attributes_source_revision_id_idx" ON "requirement_attributes"("source_revision_id");

-- CreateIndex
CREATE INDEX "requirement_sources_requirement_id_idx" ON "requirement_sources"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_sources_source_document_id_idx" ON "requirement_sources"("source_document_id");

-- CreateIndex
CREATE INDEX "requirement_relationships_from_requirement_id_idx" ON "requirement_relationships"("from_requirement_id");

-- CreateIndex
CREATE INDEX "requirement_relationships_to_requirement_id_idx" ON "requirement_relationships"("to_requirement_id");

-- CreateIndex
CREATE INDEX "requirement_relationships_created_in_change_id_idx" ON "requirement_relationships"("created_in_change_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_elements_element_code_key" ON "system_elements"("element_code");

-- CreateIndex
CREATE INDEX "system_elements_lifecycle_phase_id_idx" ON "system_elements"("lifecycle_phase_id");

-- CreateIndex
CREATE INDEX "system_element_interfaces_from_element_id_idx" ON "system_element_interfaces"("from_element_id");

-- CreateIndex
CREATE INDEX "system_element_interfaces_to_element_id_idx" ON "system_element_interfaces"("to_element_id");

-- CreateIndex
CREATE INDEX "system_element_interfaces_governing_requirement_id_idx" ON "system_element_interfaces"("governing_requirement_id");

-- CreateIndex
CREATE INDEX "requirement_allocations_requirement_id_idx" ON "requirement_allocations"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_allocations_allocated_to_element_id_idx" ON "requirement_allocations"("allocated_to_element_id");

-- CreateIndex
CREATE UNIQUE INDEX "constraints_constraint_code_key" ON "constraints"("constraint_code");

-- CreateIndex
CREATE INDEX "constraints_source_document_id_idx" ON "constraints"("source_document_id");

-- CreateIndex
CREATE INDEX "constraints_owner_org_id_idx" ON "constraints"("owner_org_id");

-- CreateIndex
CREATE INDEX "constraint_impacts_constraint_id_idx" ON "constraint_impacts"("constraint_id");

-- CreateIndex
CREATE INDEX "constraint_impacts_requirement_id_idx" ON "constraint_impacts"("requirement_id");

-- CreateIndex
CREATE INDEX "constraint_impacts_system_element_id_idx" ON "constraint_impacts"("system_element_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_methods_code_key" ON "verification_methods"("code");

-- CreateIndex
CREATE INDEX "verification_cases_requirement_id_idx" ON "verification_cases"("requirement_id");

-- CreateIndex
CREATE INDEX "verification_cases_system_element_id_idx" ON "verification_cases"("system_element_id");

-- CreateIndex
CREATE INDEX "verification_cases_verification_method_id_idx" ON "verification_cases"("verification_method_id");

-- CreateIndex
CREATE INDEX "verification_cases_planned_phase_id_idx" ON "verification_cases"("planned_phase_id");

-- CreateIndex
CREATE INDEX "verification_cases_responsible_org_id_idx" ON "verification_cases"("responsible_org_id");

-- CreateIndex
CREATE INDEX "verification_evidence_verification_case_id_idx" ON "verification_evidence"("verification_case_id");

-- CreateIndex
CREATE INDEX "verification_evidence_evidence_document_id_idx" ON "verification_evidence"("evidence_document_id");

-- CreateIndex
CREATE INDEX "validation_cases_requirement_id_idx" ON "validation_cases"("requirement_id");

-- CreateIndex
CREATE INDEX "validation_cases_evidence_document_id_idx" ON "validation_cases"("evidence_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_cr_code_key" ON "change_requests"("cr_code");

-- CreateIndex
CREATE INDEX "change_requests_initiator_org_id_idx" ON "change_requests"("initiator_org_id");

-- CreateIndex
CREATE INDEX "change_request_items_change_request_id_idx" ON "change_request_items"("change_request_id");

-- CreateIndex
CREATE INDEX "change_request_items_object_type_object_id_idx" ON "change_request_items"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "requirement_revisions_requirement_id_idx" ON "requirement_revisions"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_revisions_change_request_id_idx" ON "requirement_revisions"("change_request_id");

-- CreateIndex
CREATE INDEX "requirement_revisions_baseline_id_idx" ON "requirement_revisions"("baseline_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_revisions_requirement_id_revision_no_key" ON "requirement_revisions"("requirement_id", "revision_no");

-- CreateIndex
CREATE UNIQUE INDEX "baselines_baseline_code_key" ON "baselines"("baseline_code");

-- CreateIndex
CREATE INDEX "baselines_phase_id_idx" ON "baselines"("phase_id");

-- CreateIndex
CREATE INDEX "baseline_items_baseline_id_idx" ON "baseline_items"("baseline_id");

-- CreateIndex
CREATE INDEX "baseline_items_object_type_object_id_idx" ON "baseline_items"("object_type", "object_id");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_decision_code_key" ON "decisions"("decision_code");

-- CreateIndex
CREATE INDEX "decisions_owner_org_id_idx" ON "decisions"("owner_org_id");

-- CreateIndex
CREATE INDEX "decision_requirements_decision_id_idx" ON "decision_requirements"("decision_id");

-- CreateIndex
CREATE INDEX "decision_requirements_requirement_id_idx" ON "decision_requirements"("requirement_id");

-- CreateIndex
CREATE INDEX "decision_arguments_decision_id_idx" ON "decision_arguments"("decision_id");

-- CreateIndex
CREATE INDEX "decision_arguments_linked_document_id_idx" ON "decision_arguments"("linked_document_id");

-- CreateIndex
CREATE INDEX "requirement_conflicts_requirement_id_1_idx" ON "requirement_conflicts"("requirement_id_1");

-- CreateIndex
CREATE INDEX "requirement_conflicts_requirement_id_2_idx" ON "requirement_conflicts"("requirement_id_2");

-- CreateIndex
CREATE INDEX "requirement_conflicts_resolution_decision_id_idx" ON "requirement_conflicts"("resolution_decision_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_doc_code_key" ON "documents"("doc_code");

-- CreateIndex
CREATE INDEX "documents_owner_org_id_idx" ON "documents"("owner_org_id");

-- CreateIndex
CREATE INDEX "document_links_document_id_idx" ON "document_links"("document_id");

-- CreateIndex
CREATE INDEX "document_links_linked_object_type_linked_object_id_idx" ON "document_links"("linked_object_type", "linked_object_id");

-- CreateIndex
CREATE INDEX "document_links_link_type_idx" ON "document_links"("link_type");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_phases_phase_code_key" ON "lifecycle_phases"("phase_code");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_milestone_code_key" ON "milestones"("milestone_code");

-- CreateIndex
CREATE INDEX "milestones_phase_id_idx" ON "milestones"("phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "wbs_items_wbs_code_key" ON "wbs_items"("wbs_code");

-- CreateIndex
CREATE INDEX "wbs_items_phase_id_idx" ON "wbs_items"("phase_id");

-- CreateIndex
CREATE INDEX "requirement_schedule_links_requirement_id_idx" ON "requirement_schedule_links"("requirement_id");

-- CreateIndex
CREATE INDEX "requirement_schedule_links_milestone_id_idx" ON "requirement_schedule_links"("milestone_id");

-- CreateIndex
CREATE INDEX "requirement_schedule_links_wbs_item_id_idx" ON "requirement_schedule_links"("wbs_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_org_code_key" ON "organizations"("org_code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_code_key" ON "roles"("role_code");

-- CreateIndex
CREATE INDEX "responsibilities_object_type_object_id_idx" ON "responsibilities"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "responsibilities_organization_id_idx" ON "responsibilities"("organization_id");

-- CreateIndex
CREATE INDEX "responsibilities_role_id_idx" ON "responsibilities"("role_id");

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_level_code_fkey" FOREIGN KEY ("level_code") REFERENCES "requirement_levels"("level_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_lifecycle_phase_id_fkey" FOREIGN KEY ("lifecycle_phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_responsible_role_id_fkey" FOREIGN KEY ("responsible_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_current_revision_id_fkey" FOREIGN KEY ("current_revision_id") REFERENCES "requirement_revisions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "requirement_attributes" ADD CONSTRAINT "requirement_attributes_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_attributes" ADD CONSTRAINT "requirement_attributes_source_revision_id_fkey" FOREIGN KEY ("source_revision_id") REFERENCES "requirement_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_sources" ADD CONSTRAINT "requirement_sources_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_sources" ADD CONSTRAINT "requirement_sources_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_relationships" ADD CONSTRAINT "requirement_relationships_from_requirement_id_fkey" FOREIGN KEY ("from_requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_relationships" ADD CONSTRAINT "requirement_relationships_to_requirement_id_fkey" FOREIGN KEY ("to_requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_relationships" ADD CONSTRAINT "requirement_relationships_created_in_change_id_fkey" FOREIGN KEY ("created_in_change_id") REFERENCES "change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_elements" ADD CONSTRAINT "system_elements_parent_element_id_fkey" FOREIGN KEY ("parent_element_id") REFERENCES "system_elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_elements" ADD CONSTRAINT "system_elements_lifecycle_phase_id_fkey" FOREIGN KEY ("lifecycle_phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_element_interfaces" ADD CONSTRAINT "system_element_interfaces_from_element_id_fkey" FOREIGN KEY ("from_element_id") REFERENCES "system_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_element_interfaces" ADD CONSTRAINT "system_element_interfaces_to_element_id_fkey" FOREIGN KEY ("to_element_id") REFERENCES "system_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_element_interfaces" ADD CONSTRAINT "system_element_interfaces_governing_requirement_id_fkey" FOREIGN KEY ("governing_requirement_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_allocations" ADD CONSTRAINT "requirement_allocations_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_allocations" ADD CONSTRAINT "requirement_allocations_allocated_to_element_id_fkey" FOREIGN KEY ("allocated_to_element_id") REFERENCES "system_elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_impacts" ADD CONSTRAINT "constraint_impacts_constraint_id_fkey" FOREIGN KEY ("constraint_id") REFERENCES "constraints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_impacts" ADD CONSTRAINT "constraint_impacts_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_impacts" ADD CONSTRAINT "constraint_impacts_system_element_id_fkey" FOREIGN KEY ("system_element_id") REFERENCES "system_elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_system_element_id_fkey" FOREIGN KEY ("system_element_id") REFERENCES "system_elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_verification_method_id_fkey" FOREIGN KEY ("verification_method_id") REFERENCES "verification_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_planned_phase_id_fkey" FOREIGN KEY ("planned_phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_responsible_org_id_fkey" FOREIGN KEY ("responsible_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_verification_case_id_fkey" FOREIGN KEY ("verification_case_id") REFERENCES "verification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_cases" ADD CONSTRAINT "validation_cases_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_cases" ADD CONSTRAINT "validation_cases_evidence_document_id_fkey" FOREIGN KEY ("evidence_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_initiator_org_id_fkey" FOREIGN KEY ("initiator_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_request_items" ADD CONSTRAINT "change_request_items_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_revisions" ADD CONSTRAINT "requirement_revisions_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_revisions" ADD CONSTRAINT "requirement_revisions_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_revisions" ADD CONSTRAINT "requirement_revisions_supersedes_revision_id_fkey" FOREIGN KEY ("supersedes_revision_id") REFERENCES "requirement_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_revisions" ADD CONSTRAINT "requirement_revisions_baseline_id_fkey" FOREIGN KEY ("baseline_id") REFERENCES "baselines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baseline_items" ADD CONSTRAINT "baseline_items_baseline_id_fkey" FOREIGN KEY ("baseline_id") REFERENCES "baselines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_requirements" ADD CONSTRAINT "decision_requirements_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_requirements" ADD CONSTRAINT "decision_requirements_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_arguments" ADD CONSTRAINT "decision_arguments_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_arguments" ADD CONSTRAINT "decision_arguments_linked_document_id_fkey" FOREIGN KEY ("linked_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_conflicts" ADD CONSTRAINT "requirement_conflicts_requirement_id_1_fkey" FOREIGN KEY ("requirement_id_1") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_conflicts" ADD CONSTRAINT "requirement_conflicts_requirement_id_2_fkey" FOREIGN KEY ("requirement_id_2") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_conflicts" ADD CONSTRAINT "requirement_conflicts_resolution_decision_id_fkey" FOREIGN KEY ("resolution_decision_id") REFERENCES "decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_parent_wbs_id_fkey" FOREIGN KEY ("parent_wbs_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_schedule_links" ADD CONSTRAINT "requirement_schedule_links_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_schedule_links" ADD CONSTRAINT "requirement_schedule_links_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_schedule_links" ADD CONSTRAINT "requirement_schedule_links_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
