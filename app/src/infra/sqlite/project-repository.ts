import {
  createBuildArtifact,
  createBuildManifest,
  createChangeRequest,
  createDataBinding,
  createDataDefinition,
  createDataRevision,
  createDependencyEdge,
  createDocumentBlock,
  createLayoutIssue,
  createLogicalSection,
  createProject,
  createRun,
  createRunStep,
  createSavedRule,
  createSectionRevision,
  createSourceArtifact,
  createTemplateArtifact,
  type BuildArtifact,
  type BuildLayoutReport,
  type BuildManifest,
  type CalculationStatus,
  type ChangeAffectedScope,
  type ChangeKind,
  type ChangeRequest,
  type ChangeRequestStatus,
  type DagNodeType,
  type DataBinding,
  type DataBindingStatus,
  type DataDefinition,
  type DataLookupSpec,
  type DataProvenance,
  type DataRevision,
  type DataValidationSpec,
  type DecimalString,
  type DependencyEdge,
  type DependencyEdgeType,
  type DocumentBlock,
  type DocumentBlockType,
  type DocumentBuildStatus,
  type HumanReviewTrigger,
  type LayoutIssue,
  type LayoutIssueSeverity,
  type LayoutIssueType,
  type LayoutPolicySpec,
  type LogicalSection,
  type OoxmlPatchCommand,
  type OoxmlTemplateMap,
  type Project,
  type ProjectStatus,
  type RendererInfoSpec,
  type RuleScalarDataType,
  type RuleStatus,
  type Run,
  type RunExecutionResult,
  type RunMode,
  type RunStep,
  type RunStepEvidence,
  type SavedRule,
  type SectionApprovalRecord,
  type SectionRevision,
  type SectionRevisionStatus,
  type SourceArtifact,
  type SourceArtifactType,
  type TemplateArtifact,
  type TypedRuleExecutionPlan,
  type TypedRuleIoSchema,
  type TypedRuleTestCase
} from '@core/domain';
import type { ProjectRepositoryPort } from '@core/ports';
import type { SqliteDatabaseConnection } from './connection';

/**
 * Cài đặt bền vững nguyên tử `ProjectRepositoryPort` trên `project.sqlite` cho đầy đủ 17 thực thể miền (§5 & §9.2).
 */
export class SqliteProjectRepository implements ProjectRepositoryPort {
  private readonly connection: SqliteDatabaseConnection;

  public constructor(connection: SqliteDatabaseConnection) {
    this.connection = connection;
  }

  public async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.connection.runInTransaction(work);
  }

  // 1. Project & Template V0
  public async getProject(projectId: string): Promise<Project | null> {
    const row = this.connection
      .prepare(
        `SELECT id, title, status, current_recipe_version, created_at, updated_at
         FROM projects WHERE id = ?`
      )
      .get(projectId) as
      | {
          id: string;
          title: string;
          status: ProjectStatus;
          current_recipe_version: number;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return createProject({
      id: row.id,
      title: row.title,
      status: row.status,
      currentRecipeVersion: row.current_recipe_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  public async saveProject(project: Project): Promise<void> {
    const validated = createProject(project);
    this.connection.assertWritable('saveProject');
    this.connection
      .prepare(
        `INSERT INTO projects (id, title, status, current_recipe_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           status = excluded.status,
           current_recipe_version = excluded.current_recipe_version,
           updated_at = excluded.updated_at`
      )
      .run(
        validated.id,
        validated.title,
        validated.status,
        validated.currentRecipeVersion,
        validated.createdAt,
        validated.updatedAt
      );
  }

  public async getTemplateArtifact(projectId: string): Promise<TemplateArtifact | null> {
    const row = this.connection
      .prepare(
        `SELECT id, path, sha256, parsed_at, ooxml_map_json
         FROM template_artifacts WHERE project_id = ?`
      )
      .get(projectId) as
      | {
          id: string;
          path: string;
          sha256: string;
          parsed_at: string;
          ooxml_map_json: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return createTemplateArtifact({
      id: row.id,
      path: row.path,
      sha256: row.sha256,
      parsedAt: row.parsed_at,
      ooxmlMap: JSON.parse(row.ooxml_map_json) as OoxmlTemplateMap
    });
  }

  public async saveTemplateArtifact(projectId: string, template: TemplateArtifact): Promise<void> {
    const validated = createTemplateArtifact(template);
    this.connection.runInTransactionSync(() => {
      this.connection
        .prepare(
          `INSERT INTO template_artifacts (project_id, id, path, sha256, parsed_at, ooxml_map_json, read_only)
           VALUES (?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(project_id) DO UPDATE SET
             id = excluded.id,
             path = excluded.path,
             sha256 = excluded.sha256,
             parsed_at = excluded.parsed_at,
             ooxml_map_json = excluded.ooxml_map_json,
             read_only = 1`
        )
        .run(
          projectId,
          validated.id,
          validated.path,
          validated.sha256,
          validated.parsedAt,
          JSON.stringify(validated.ooxmlMap)
        );
    });
  }

  // 2. Source Snapshots & Data Registry
  public async listSourceArtifacts(projectId: string): Promise<readonly SourceArtifact[]> {
    const rows = this.connection
      .prepare(
        `SELECT id, type, path, version, sha256, imported_at
         FROM source_artifacts
         WHERE project_id = ?
         ORDER BY id ASC, version ASC`
      )
      .all(projectId) as unknown as Array<{
      id: string;
      type: SourceArtifactType;
      path: string;
      version: number;
      sha256: string;
      imported_at: string;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createSourceArtifact({
          id: row.id,
          type: row.type,
          path: row.path,
          version: row.version,
          sha256: row.sha256,
          importedAt: row.imported_at
        })
      )
    );
  }

  public async getSourceArtifact(
    projectId: string,
    sourceId: string,
    version?: number
  ): Promise<SourceArtifact | null> {
    const row = (
      version !== undefined
        ? this.connection
            .prepare(
              `SELECT id, type, path, version, sha256, imported_at
               FROM source_artifacts
               WHERE project_id = ? AND id = ? AND version = ?`
            )
            .get(projectId, sourceId, version)
        : this.connection
            .prepare(
              `SELECT id, type, path, version, sha256, imported_at
               FROM source_artifacts
               WHERE project_id = ? AND id = ?
               ORDER BY version DESC LIMIT 1`
            )
            .get(projectId, sourceId)
    ) as
      | {
          id: string;
          type: SourceArtifactType;
          path: string;
          version: number;
          sha256: string;
          imported_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return createSourceArtifact({
      id: row.id,
      type: row.type,
      path: row.path,
      version: row.version,
      sha256: row.sha256,
      importedAt: row.imported_at
    });
  }

  public async saveSourceArtifact(projectId: string, source: SourceArtifact): Promise<void> {
    const validated = createSourceArtifact(source);
    this.connection.assertWritable('saveSourceArtifact');
    this.connection
      .prepare(
        `INSERT INTO source_artifacts (project_id, id, version, type, path, sha256, imported_at, read_only)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        projectId,
        validated.id,
        validated.version,
        validated.type,
        validated.path,
        validated.sha256,
        validated.importedAt
      );
  }

  public async listDataDefinitions(projectId: string): Promise<readonly DataDefinition[]> {
    const rows = this.connection
      .prepare(
        `SELECT key, data_type, unit, validation_json, default_policy
         FROM data_definitions
         WHERE project_id = ?
         ORDER BY key ASC`
      )
      .all(projectId) as unknown as Array<{
      key: string;
      data_type: RuleScalarDataType;
      unit: string | null;
      validation_json: string;
      default_policy: DataDefinition['defaultPolicy'];
    }>;

    return Object.freeze(
      rows.map((row) =>
        createDataDefinition({
          key: row.key,
          dataType: row.data_type,
          unit: row.unit,
          validation: JSON.parse(row.validation_json) as DataValidationSpec,
          defaultPolicy: row.default_policy
        })
      )
    );
  }

  public async saveDataDefinition(projectId: string, definition: DataDefinition): Promise<void> {
    const validated = createDataDefinition(definition);
    this.connection.assertWritable('saveDataDefinition');
    this.connection
      .prepare(
        `INSERT INTO data_definitions (project_id, key, data_type, unit, validation_json, default_policy)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, key) DO UPDATE SET
           data_type = excluded.data_type,
           unit = excluded.unit,
           validation_json = excluded.validation_json,
           default_policy = excluded.default_policy`
      )
      .run(
        projectId,
        validated.key,
        validated.dataType,
        validated.unit,
        JSON.stringify(validated.validation),
        validated.defaultPolicy
      );
  }

  public async listDataBindings(projectId: string): Promise<readonly DataBinding[]> {
    const rows = this.connection
      .prepare(
        `SELECT id, version, target_key, source_id, source_sha256, range_selector, lookup_spec_json, priority, status
         FROM data_bindings
         WHERE project_id = ?
         ORDER BY priority ASC, id ASC, version DESC`
      )
      .all(projectId) as unknown as Array<{
      id: string;
      version: number;
      target_key: string | null;
      source_id: string;
      source_sha256: string | null;
      range_selector: string;
      lookup_spec_json: string;
      priority: number;
      status: DataBindingStatus;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createDataBinding({
          id: row.id,
          ...(row.target_key !== null ? { targetKey: row.target_key } : {}),
          sourceId: row.source_id,
          ...(row.source_sha256 !== null ? { sourceSha256: row.source_sha256 } : {}),
          rangeSelector: row.range_selector,
          lookupSpec: JSON.parse(row.lookup_spec_json) as DataLookupSpec,
          priority: row.priority,
          version: row.version,
          status: row.status
        })
      )
    );
  }

  public async saveDataBinding(projectId: string, binding: DataBinding): Promise<void> {
    const validated = createDataBinding(binding);
    this.connection.assertWritable('saveDataBinding');
    this.connection
      .prepare(
        `INSERT INTO data_bindings (
           project_id, id, version, target_key, source_id, source_sha256, range_selector, lookup_spec_json, priority, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, id, version) DO UPDATE SET
           target_key = excluded.target_key,
           source_id = excluded.source_id,
           source_sha256 = excluded.source_sha256,
           range_selector = excluded.range_selector,
           lookup_spec_json = excluded.lookup_spec_json,
           priority = excluded.priority,
           status = excluded.status`
      )
      .run(
        projectId,
        validated.id,
        validated.version,
        validated.targetKey ?? null,
        validated.sourceId,
        validated.sourceSha256 ?? null,
        validated.rangeSelector,
        JSON.stringify(validated.lookupSpec),
        validated.priority,
        validated.status
      );
  }

  public async listDataRevisions(
    projectId: string,
    key?: string
  ): Promise<readonly DataRevision[]> {
    const rows = (
      key !== undefined
        ? this.connection
            .prepare(
              `SELECT id, key, value_json, provenance_json, status, version, created_at
               FROM data_revisions
               WHERE project_id = ? AND key = ?
               ORDER BY version ASC, created_at ASC`
            )
            .all(projectId, key)
        : this.connection
            .prepare(
              `SELECT id, key, value_json, provenance_json, status, version, created_at
               FROM data_revisions
               WHERE project_id = ?
               ORDER BY key ASC, version ASC`
            )
            .all(projectId)
    ) as unknown as Array<{
      id: string;
      key: string;
      value_json: string;
      provenance_json: string;
      status: CalculationStatus;
      version: number;
      created_at: string;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createDataRevision({
          id: row.id,
          key: row.key,
          value: JSON.parse(row.value_json) as DecimalString | string | number | boolean | null,
          provenance: JSON.parse(row.provenance_json) as DataProvenance,
          status: row.status,
          version: row.version,
          createdAt: row.created_at
        })
      )
    );
  }

  public async saveDataRevision(projectId: string, revision: DataRevision): Promise<void> {
    const validated = createDataRevision(revision);
    this.connection.assertWritable('saveDataRevision');
    this.connection
      .prepare(
        `INSERT INTO data_revisions (
           project_id, id, key, value_json, provenance_json, status, version, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, id) DO UPDATE SET
           status = excluded.status`
      )
      .run(
        projectId,
        validated.id,
        validated.key,
        JSON.stringify(validated.value),
        JSON.stringify(validated.provenance),
        validated.status,
        validated.version,
        validated.createdAt
      );
  }

  // 3. Logical Sections & Document Blocks (Section != Page)
  public async listLogicalSections(projectId: string): Promise<readonly LogicalSection[]> {
    const rows = this.connection
      .prepare(
        `SELECT id, parent_id, title, section_order, start_anchor, end_anchor, required_for_build
         FROM logical_sections
         WHERE project_id = ?
         ORDER BY section_order ASC, id ASC`
      )
      .all(projectId) as unknown as Array<{
      id: string;
      parent_id: string | null;
      title: string;
      section_order: number;
      start_anchor: string;
      end_anchor: string;
      required_for_build: number;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createLogicalSection({
          id: row.id,
          parentId: row.parent_id,
          title: row.title,
          order: row.section_order,
          startAnchor: row.start_anchor,
          endAnchor: row.end_anchor,
          requiredForBuild: row.required_for_build === 1
        })
      )
    );
  }

  public async listDocumentBlocks(
    projectId: string,
    sectionId?: string
  ): Promise<readonly DocumentBlock[]> {
    const rows = (
      sectionId !== undefined
        ? this.connection
            .prepare(
              `SELECT id, section_id, ooxml_locator, type, style_ref, anchor_fingerprint
               FROM document_blocks
               WHERE project_id = ? AND section_id = ?
               ORDER BY block_order ASC, id ASC`
            )
            .all(projectId, sectionId)
        : this.connection
            .prepare(
              `SELECT id, section_id, ooxml_locator, type, style_ref, anchor_fingerprint
               FROM document_blocks
               WHERE project_id = ?
               ORDER BY block_order ASC, id ASC`
            )
            .all(projectId)
    ) as unknown as Array<{
      id: string;
      section_id: string;
      ooxml_locator: string;
      type: DocumentBlockType;
      style_ref: string | null;
      anchor_fingerprint: string;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createDocumentBlock({
          id: row.id,
          sectionId: row.section_id,
          ooxmlLocator: row.ooxml_locator,
          type: row.type,
          styleRef: row.style_ref,
          anchorFingerprint: row.anchor_fingerprint
        })
      )
    );
  }

  public async saveDocumentStructure(
    projectId: string,
    sections: readonly LogicalSection[],
    blocks: readonly DocumentBlock[]
  ): Promise<void> {
    const validatedSections = sections.map((s) => createLogicalSection(s));
    const validatedBlocks = blocks.map((b) => createDocumentBlock(b));

    this.connection.runInTransactionSync(() => {
      this.connection
        .prepare('DELETE FROM document_blocks WHERE project_id = ?')
        .run(projectId);
      this.connection
        .prepare('DELETE FROM logical_sections WHERE project_id = ?')
        .run(projectId);

      const insertSection = this.connection.prepare(
        `INSERT INTO logical_sections (
           project_id, id, parent_id, title, section_order, start_anchor, end_anchor, required_for_build
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const sec of validatedSections) {
        insertSection.run(
          projectId,
          sec.id,
          sec.parentId,
          sec.title,
          sec.order,
          sec.startAnchor,
          sec.endAnchor,
          sec.requiredForBuild !== false ? 1 : 0
        );
      }

      const insertBlock = this.connection.prepare(
        `INSERT INTO document_blocks (
           project_id, id, section_id, ooxml_locator, type, style_ref, anchor_fingerprint, block_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      validatedBlocks.forEach((blk, index) => {
        insertBlock.run(
          projectId,
          blk.id,
          blk.sectionId,
          blk.ooxmlLocator,
          blk.type,
          blk.styleRef,
          blk.anchorFingerprint,
          index
        );
      });
    });
  }

  // 4. Change Requests & Saved Rules (Recipe)
  public async listChangeRequests(
    projectId: string,
    sectionId?: string
  ): Promise<readonly ChangeRequest[]> {
    const rows = (
      sectionId !== undefined
        ? this.connection
            .prepare(
              `SELECT id, section_id, prompt, change_kind, status, affected_scope,
                      old_value_json, new_value_json, linked_build_id, created_at, updated_at
               FROM change_requests
               WHERE project_id = ? AND section_id = ?
               ORDER BY created_at ASC, id ASC`
            )
            .all(projectId, sectionId)
        : this.connection
            .prepare(
              `SELECT id, section_id, prompt, change_kind, status, affected_scope,
                      old_value_json, new_value_json, linked_build_id, created_at, updated_at
               FROM change_requests
               WHERE project_id = ?
               ORDER BY created_at ASC, id ASC`
            )
            .all(projectId)
    ) as unknown as Array<{
      id: string;
      section_id: string;
      prompt: string;
      change_kind: ChangeKind;
      status: ChangeRequestStatus;
      affected_scope: ChangeAffectedScope;
      old_value_json: string | null;
      new_value_json: string | null;
      linked_build_id: string | null;
      created_at: string;
      updated_at: string;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createChangeRequest({
          id: row.id,
          sectionId: row.section_id,
          prompt: row.prompt,
          changeKind: row.change_kind,
          status: row.status,
          affectedScope: row.affected_scope,
          ...(row.old_value_json !== null
            ? {
                oldValue: JSON.parse(row.old_value_json) as
                  | DecimalString
                  | string
                  | number
                  | boolean
                  | null
              }
            : {}),
          ...(row.new_value_json !== null
            ? {
                newValue: JSON.parse(row.new_value_json) as
                  | DecimalString
                  | string
                  | number
                  | boolean
                  | null
              }
            : {}),
          linkedBuildId: row.linked_build_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })
      )
    );
  }

  public async saveChangeRequest(projectId: string, changeRequest: ChangeRequest): Promise<void> {
    const validated = createChangeRequest(changeRequest);
    this.connection.assertWritable('saveChangeRequest');
    this.connection
      .prepare(
        `INSERT INTO change_requests (
           project_id, id, section_id, prompt, change_kind, status, affected_scope,
           old_value_json, new_value_json, linked_build_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, id) DO UPDATE SET
           prompt = excluded.prompt,
           change_kind = excluded.change_kind,
           status = excluded.status,
           affected_scope = excluded.affected_scope,
           old_value_json = excluded.old_value_json,
           new_value_json = excluded.new_value_json,
           linked_build_id = excluded.linked_build_id,
           updated_at = excluded.updated_at`
      )
      .run(
        projectId,
        validated.id,
        validated.sectionId,
        validated.prompt,
        validated.changeKind,
        validated.status,
        validated.affectedScope,
        validated.oldValue !== undefined ? JSON.stringify(validated.oldValue) : null,
        validated.newValue !== undefined ? JSON.stringify(validated.newValue) : null,
        validated.linkedBuildId ?? null,
        validated.createdAt,
        validated.updatedAt
      );
  }

  public async getSavedRule(
    projectId: string,
    ruleId: string,
    version?: number
  ): Promise<SavedRule | null> {
    const row = (
      version !== undefined
        ? this.connection
            .prepare(
              `SELECT id, version, target_section_id, text_instruction, io_schema_json,
                      execution_plan_json, test_cases_json, status, requires_human_review, review_triggers_json
               FROM saved_rules
               WHERE project_id = ? AND id = ? AND version = ?`
            )
            .get(projectId, ruleId, version)
        : this.connection
            .prepare(
              `SELECT id, version, target_section_id, text_instruction, io_schema_json,
                      execution_plan_json, test_cases_json, status, requires_human_review, review_triggers_json
               FROM saved_rules
               WHERE project_id = ? AND id = ?
               ORDER BY version DESC LIMIT 1`
            )
            .get(projectId, ruleId)
    ) as
      | {
          id: string;
          version: number;
          target_section_id: string | null;
          text_instruction: string;
          io_schema_json: string;
          execution_plan_json: string;
          test_cases_json: string;
          status: RuleStatus;
          requires_human_review: number;
          review_triggers_json: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return createSavedRule({
      id: row.id,
      version: row.version,
      ...(row.target_section_id !== null ? { targetSectionId: row.target_section_id } : {}),
      textInstruction: row.text_instruction,
      ioSchema: JSON.parse(row.io_schema_json) as TypedRuleIoSchema,
      executionPlan: JSON.parse(row.execution_plan_json) as TypedRuleExecutionPlan,
      testCases: JSON.parse(row.test_cases_json) as TypedRuleTestCase[],
      status: row.status,
      requiresHumanReview: row.requires_human_review === 1,
      ...(row.review_triggers_json !== null
        ? { reviewTriggers: JSON.parse(row.review_triggers_json) as HumanReviewTrigger[] }
        : {})
    });
  }

  public async listSavedRules(projectId: string): Promise<readonly SavedRule[]> {
    const rows = this.connection
      .prepare(
        `SELECT id, version, target_section_id, text_instruction, io_schema_json,
                execution_plan_json, test_cases_json, status, requires_human_review, review_triggers_json
         FROM saved_rules
         WHERE project_id = ?
         ORDER BY id ASC, version DESC`
      )
      .all(projectId) as unknown as Array<{
      id: string;
      version: number;
      target_section_id: string | null;
      text_instruction: string;
      io_schema_json: string;
      execution_plan_json: string;
      test_cases_json: string;
      status: RuleStatus;
      requires_human_review: number;
      review_triggers_json: string | null;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createSavedRule({
          id: row.id,
          version: row.version,
          ...(row.target_section_id !== null ? { targetSectionId: row.target_section_id } : {}),
          textInstruction: row.text_instruction,
          ioSchema: JSON.parse(row.io_schema_json) as TypedRuleIoSchema,
          executionPlan: JSON.parse(row.execution_plan_json) as TypedRuleExecutionPlan,
          testCases: JSON.parse(row.test_cases_json) as TypedRuleTestCase[],
          status: row.status,
          requiresHumanReview: row.requires_human_review === 1,
          ...(row.review_triggers_json !== null
            ? { reviewTriggers: JSON.parse(row.review_triggers_json) as HumanReviewTrigger[] }
            : {})
        })
      )
    );
  }

  public async saveRuleVersion(projectId: string, rule: SavedRule): Promise<void> {
    const validated = createSavedRule(rule);
    this.connection.assertWritable('saveRuleVersion');
    this.connection
      .prepare(
        `INSERT INTO saved_rules (
           project_id, id, version, target_section_id, text_instruction, io_schema_json,
           execution_plan_json, test_cases_json, status, requires_human_review, review_triggers_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, id, version) DO UPDATE SET
           status = excluded.status,
           test_cases_json = excluded.test_cases_json`
      )
      .run(
        projectId,
        validated.id,
        validated.version,
        validated.targetSectionId ?? null,
        validated.textInstruction,
        JSON.stringify(validated.ioSchema),
        JSON.stringify(validated.executionPlan),
        JSON.stringify(validated.testCases),
        validated.status,
        validated.requiresHumanReview ? 1 : 0,
        validated.reviewTriggers ? JSON.stringify(validated.reviewTriggers) : null
      );
  }

  // 5. Dependency Graph, Runs & RunStep Evidence
  public async listDependencyEdges(projectId: string): Promise<readonly DependencyEdge[]> {
    const rows = this.connection
      .prepare(
        `SELECT id, from_id, to_id, from_node_type, to_node_type, type, condition_expr, discovered_by, approved
         FROM dependency_edges
         WHERE project_id = ?
         ORDER BY edge_order ASC, id ASC`
      )
      .all(projectId) as unknown as Array<{
      id: string;
      from_id: string;
      to_id: string;
      from_node_type: DagNodeType | null;
      to_node_type: DagNodeType | null;
      type: DependencyEdgeType;
      condition_expr: string | null;
      discovered_by: DependencyEdge['discoveredBy'];
      approved: number;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createDependencyEdge({
          id: row.id,
          fromId: row.from_id,
          toId: row.to_id,
          ...(row.from_node_type !== null ? { fromNodeType: row.from_node_type } : {}),
          ...(row.to_node_type !== null ? { toNodeType: row.to_node_type } : {}),
          type: row.type,
          condition: row.condition_expr,
          discoveredBy: row.discovered_by,
          approved: row.approved === 1
        })
      )
    );
  }

  public async replaceDependencyEdges(
    projectId: string,
    edges: readonly DependencyEdge[]
  ): Promise<void> {
    const validatedEdges = edges.map((e) => createDependencyEdge(e));
    this.connection.runInTransactionSync(() => {
      this.connection
        .prepare('DELETE FROM dependency_edges WHERE project_id = ?')
        .run(projectId);
      const insertStmt = this.connection.prepare(
        `INSERT INTO dependency_edges (
           project_id, id, from_id, to_id, from_node_type, to_node_type,
           type, condition_expr, discovered_by, approved, edge_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      validatedEdges.forEach((edge, index) => {
        insertStmt.run(
          projectId,
          edge.id,
          edge.fromId,
          edge.toId,
          edge.fromNodeType ?? null,
          edge.toNodeType ?? null,
          edge.type,
          edge.condition,
          edge.discoveredBy,
          edge.approved ? 1 : 0,
          index
        );
      });
    });
  }

  public async saveRunWithSteps(
    projectId: string,
    run: Run,
    steps: readonly RunStep[]
  ): Promise<void> {
    const validatedRun = createRun(run);
    const validatedSteps = steps.map((s) => createRunStep(s));

    this.connection.runInTransactionSync(() => {
      this.connection
        .prepare(
          `INSERT INTO runs (
             project_id, id, mode, plan_hash, snapshot_id, started_at, completed_at, result
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(project_id, id) DO UPDATE SET
             completed_at = excluded.completed_at,
             result = excluded.result`
        )
        .run(
          projectId,
          validatedRun.id,
          validatedRun.mode,
          validatedRun.planHash,
          validatedRun.snapshotId,
          validatedRun.startedAt,
          validatedRun.completedAt,
          validatedRun.result
        );

      this.connection
        .prepare('DELETE FROM run_steps WHERE project_id = ? AND run_id = ?')
        .run(projectId, validatedRun.id);

      const insertStep = this.connection.prepare(
        `INSERT INTO run_steps (
           project_id, id, run_id, step_order, rule_id, rule_version,
           input_hashes_json, output_hash, result_fingerprint, evidence_json, errors_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      validatedSteps.forEach((step, index) => {
        insertStep.run(
          projectId,
          step.id,
          step.runId,
          index,
          step.ruleId,
          step.ruleVersion ?? null,
          JSON.stringify(step.inputHashes),
          step.outputHash,
          step.resultFingerprint,
          JSON.stringify(step.evidence),
          JSON.stringify(step.errors)
        );
      });
    });
  }

  public async getRunWithSteps(
    projectId: string,
    runId: string
  ): Promise<{ readonly run: Run; readonly steps: readonly RunStep[] } | null> {
    const runRow = this.connection
      .prepare(
        `SELECT id, mode, plan_hash, snapshot_id, started_at, completed_at, result
         FROM runs WHERE project_id = ? AND id = ?`
      )
      .get(projectId, runId) as
      | {
          id: string;
          mode: RunMode;
          plan_hash: string;
          snapshot_id: string;
          started_at: string;
          completed_at: string | null;
          result: RunExecutionResult;
        }
      | undefined;

    if (!runRow) {
      return null;
    }

    const stepRows = this.connection
      .prepare(
        `SELECT id, run_id, rule_id, rule_version, input_hashes_json,
                output_hash, result_fingerprint, evidence_json, errors_json
         FROM run_steps
         WHERE project_id = ? AND run_id = ?
         ORDER BY step_order ASC, id ASC`
      )
      .all(projectId, runId) as unknown as Array<{
      id: string;
      run_id: string;
      rule_id: string;
      rule_version: number | null;
      input_hashes_json: string;
      output_hash: string | null;
      result_fingerprint: string | null;
      evidence_json: string;
      errors_json: string;
    }>;

    const run = createRun({
      id: runRow.id,
      mode: runRow.mode,
      planHash: runRow.plan_hash,
      snapshotId: runRow.snapshot_id,
      startedAt: runRow.started_at,
      completedAt: runRow.completed_at,
      result: runRow.result
    });

    const steps = stepRows.map((row) =>
      createRunStep({
        id: row.id,
        runId: row.run_id,
        ruleId: row.rule_id,
        ...(row.rule_version !== null ? { ruleVersion: row.rule_version } : {}),
        inputHashes: JSON.parse(row.input_hashes_json) as Record<string, string>,
        outputHash: row.output_hash,
        resultFingerprint: row.result_fingerprint,
        evidence: JSON.parse(row.evidence_json) as RunStepEvidence,
        errors: JSON.parse(row.errors_json) as string[]
      })
    );

    return Object.freeze({
      run,
      steps: Object.freeze(steps)
    });
  }

  // 6. Section Revisions
  public async getSectionRevision(
    projectId: string,
    revisionId: string
  ): Promise<SectionRevision | null> {
    const row = this.connection
      .prepare(
        `SELECT id, section_id, base_template_hash, rule_id, rule_version,
                input_fingerprint, outputs_json, patch_set_json, review_status, approval_json
         FROM section_revisions
         WHERE project_id = ? AND id = ?`
      )
      .get(projectId, revisionId) as
      | {
          id: string;
          section_id: string;
          base_template_hash: string;
          rule_id: string | null;
          rule_version: number | null;
          input_fingerprint: string;
          outputs_json: string;
          patch_set_json: string;
          review_status: SectionRevisionStatus;
          approval_json: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return createSectionRevision({
      id: row.id,
      sectionId: row.section_id,
      baseTemplateHash: row.base_template_hash,
      ruleId: row.rule_id,
      ruleVersion: row.rule_version,
      inputFingerprint: row.input_fingerprint,
      outputs: JSON.parse(row.outputs_json) as Record<string, unknown>,
      patchSet: JSON.parse(row.patch_set_json) as OoxmlPatchCommand[],
      reviewStatus: row.review_status,
      approval: row.approval_json ? (JSON.parse(row.approval_json) as SectionApprovalRecord) : null
    });
  }

  public async listSectionRevisions(
    projectId: string,
    sectionId?: string
  ): Promise<readonly SectionRevision[]> {
    const rows = (
      sectionId !== undefined
        ? this.connection
            .prepare(
              `SELECT id, section_id, base_template_hash, rule_id, rule_version,
                      input_fingerprint, outputs_json, patch_set_json, review_status, approval_json
               FROM section_revisions
               WHERE project_id = ? AND section_id = ?
               ORDER BY revision_order ASC, id ASC`
            )
            .all(projectId, sectionId)
        : this.connection
            .prepare(
              `SELECT id, section_id, base_template_hash, rule_id, rule_version,
                      input_fingerprint, outputs_json, patch_set_json, review_status, approval_json
               FROM section_revisions
               WHERE project_id = ?
               ORDER BY revision_order ASC, id ASC`
            )
            .all(projectId)
    ) as unknown as Array<{
      id: string;
      section_id: string;
      base_template_hash: string;
      rule_id: string | null;
      rule_version: number | null;
      input_fingerprint: string;
      outputs_json: string;
      patch_set_json: string;
      review_status: SectionRevisionStatus;
      approval_json: string | null;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createSectionRevision({
          id: row.id,
          sectionId: row.section_id,
          baseTemplateHash: row.base_template_hash,
          ruleId: row.rule_id,
          ruleVersion: row.rule_version,
          inputFingerprint: row.input_fingerprint,
          outputs: JSON.parse(row.outputs_json) as Record<string, unknown>,
          patchSet: JSON.parse(row.patch_set_json) as OoxmlPatchCommand[],
          reviewStatus: row.review_status,
          approval: row.approval_json
            ? (JSON.parse(row.approval_json) as SectionApprovalRecord)
            : null
        })
      )
    );
  }

  public async saveSectionRevisions(
    projectId: string,
    revisions: readonly SectionRevision[]
  ): Promise<void> {
    const validatedRevisions = revisions.map((r) => createSectionRevision(r));
    this.connection.runInTransactionSync(() => {
      const maxOrderRow = this.connection
        .prepare(
          'SELECT COALESCE(MAX(revision_order), 0) AS max_order FROM section_revisions WHERE project_id = ?'
        )
        .get(projectId) as { max_order: number } | undefined;
      let nextOrder = (maxOrderRow?.max_order ?? 0) + 1;

      const upsertStmt = this.connection.prepare(
        `INSERT INTO section_revisions (
           project_id, id, section_id, base_template_hash, rule_id, rule_version,
           input_fingerprint, outputs_json, patch_set_json, review_status, approval_json, revision_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(project_id, id) DO UPDATE SET
           review_status = excluded.review_status,
           approval_json = excluded.approval_json`
      );

      for (const rev of validatedRevisions) {
        upsertStmt.run(
          projectId,
          rev.id,
          rev.sectionId,
          rev.baseTemplateHash,
          rev.ruleId,
          rev.ruleVersion,
          rev.inputFingerprint,
          JSON.stringify(rev.outputs),
          JSON.stringify(rev.patchSet),
          rev.reviewStatus,
          rev.approval ? JSON.stringify(rev.approval) : null,
          nextOrder++
        );
      }
    });
  }

  // 7. Build Manifests, Build Artifacts & Layout Issues
  public async getBuildManifest(
    projectId: string,
    manifestId: string
  ): Promise<BuildManifest | null> {
    const row = this.connection
      .prepare(
        `SELECT id, template_hash, source_snapshot_ids_json, recipe_version,
                rule_versions_json, selected_revisions_json, layout_policy_json, renderer_info_json, status
         FROM builds
         WHERE project_id = ? AND id = ?`
      )
      .get(projectId, manifestId) as
      | {
          id: string;
          template_hash: string;
          source_snapshot_ids_json: string;
          recipe_version: number;
          rule_versions_json: string;
          selected_revisions_json: string;
          layout_policy_json: string;
          renderer_info_json: string;
          status: DocumentBuildStatus;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return createBuildManifest({
      id: row.id,
      templateHash: row.template_hash,
      sourceSnapshotIds: JSON.parse(row.source_snapshot_ids_json) as string[],
      recipeVersion: row.recipe_version,
      ruleVersions: JSON.parse(row.rule_versions_json) as Record<string, number>,
      selectedRevisions: JSON.parse(row.selected_revisions_json) as Record<string, string>,
      layoutPolicy: JSON.parse(row.layout_policy_json) as LayoutPolicySpec,
      rendererInfo: JSON.parse(row.renderer_info_json) as RendererInfoSpec,
      status: row.status
    });
  }

  public async listBuildManifests(projectId: string): Promise<readonly BuildManifest[]> {
    const rows = this.connection
      .prepare(
        `SELECT id, template_hash, source_snapshot_ids_json, recipe_version,
                rule_versions_json, selected_revisions_json, layout_policy_json, renderer_info_json, status
         FROM builds
         WHERE project_id = ?
         ORDER BY build_order ASC, id ASC`
      )
      .all(projectId) as unknown as Array<{
      id: string;
      template_hash: string;
      source_snapshot_ids_json: string;
      recipe_version: number;
      rule_versions_json: string;
      selected_revisions_json: string;
      layout_policy_json: string;
      renderer_info_json: string;
      status: DocumentBuildStatus;
    }>;

    return Object.freeze(
      rows.map((row) =>
        createBuildManifest({
          id: row.id,
          templateHash: row.template_hash,
          sourceSnapshotIds: JSON.parse(row.source_snapshot_ids_json) as string[],
          recipeVersion: row.recipe_version,
          ruleVersions: JSON.parse(row.rule_versions_json) as Record<string, number>,
          selectedRevisions: JSON.parse(row.selected_revisions_json) as Record<string, string>,
          layoutPolicy: JSON.parse(row.layout_policy_json) as LayoutPolicySpec,
          rendererInfo: JSON.parse(row.renderer_info_json) as RendererInfoSpec,
          status: row.status
        })
      )
    );
  }

  public async saveBuildManifest(projectId: string, manifest: BuildManifest): Promise<void> {
    const validated = createBuildManifest(manifest);
    this.connection.runInTransactionSync(() => {
      const maxOrderRow = this.connection
        .prepare('SELECT COALESCE(MAX(build_order), 0) AS max_order FROM builds WHERE project_id = ?')
        .get(projectId) as { max_order: number } | undefined;
      const nextOrder = (maxOrderRow?.max_order ?? 0) + 1;

      this.connection
        .prepare(
          `INSERT INTO builds (
             project_id, id, template_hash, source_snapshot_ids_json, recipe_version,
             rule_versions_json, selected_revisions_json, layout_policy_json, renderer_info_json, status, build_order
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(project_id, id) DO UPDATE SET
             status = excluded.status,
             layout_policy_json = excluded.layout_policy_json,
             renderer_info_json = excluded.renderer_info_json`
        )
        .run(
          projectId,
          validated.id,
          validated.templateHash,
          JSON.stringify(validated.sourceSnapshotIds),
          validated.recipeVersion,
          JSON.stringify(validated.ruleVersions),
          JSON.stringify(validated.selectedRevisions),
          JSON.stringify(validated.layoutPolicy),
          JSON.stringify(validated.rendererInfo),
          validated.status,
          nextOrder
        );
    });
  }

  public async saveBuildArtifactWithIssues(
    projectId: string,
    artifact: BuildArtifact,
    issues: readonly LayoutIssue[]
  ): Promise<void> {
    const validatedArtifact = createBuildArtifact(artifact);
    const validatedIssues = issues.map((i) => createLayoutIssue(i));

    this.connection.runInTransactionSync(() => {
      this.connection
        .prepare(
          `INSERT INTO build_artifacts (
             project_id, id, manifest_id, docx_path, pdf_preview_path, checksum, page_count, layout_report_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(project_id, id) DO UPDATE SET
             pdf_preview_path = excluded.pdf_preview_path,
             layout_report_json = excluded.layout_report_json`
        )
        .run(
          projectId,
          validatedArtifact.id,
          validatedArtifact.manifestId,
          validatedArtifact.docxPath,
          validatedArtifact.pdfPreviewPath,
          validatedArtifact.checksum,
          validatedArtifact.pageCount,
          JSON.stringify(validatedArtifact.layoutReport),
          validatedArtifact.createdAt
        );

      this.connection
        .prepare('DELETE FROM layout_issues WHERE project_id = ? AND build_id = ?')
        .run(projectId, validatedArtifact.id);

      const insertIssue = this.connection.prepare(
        `INSERT INTO layout_issues (
           project_id, id, build_id, issue_order, section_id, block_id, type, severity, start_page, end_page, detail
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      validatedIssues.forEach((issue, index) => {
        insertIssue.run(
          projectId,
          issue.id,
          issue.buildId,
          index,
          issue.sectionId,
          issue.blockId,
          issue.type,
          issue.severity,
          issue.pageRange[0],
          issue.pageRange[1],
          issue.detail
        );
      });
    });
  }

  public async getBuildArtifactWithIssues(
    projectId: string,
    buildId: string
  ): Promise<{
    readonly artifact: BuildArtifact;
    readonly issues: readonly LayoutIssue[];
  } | null> {
    const artifactRow = this.connection
      .prepare(
        `SELECT id, manifest_id, docx_path, pdf_preview_path, checksum, page_count, layout_report_json, created_at
         FROM build_artifacts
         WHERE project_id = ? AND id = ?`
      )
      .get(projectId, buildId) as
      | {
          id: string;
          manifest_id: string;
          docx_path: string;
          pdf_preview_path: string | null;
          checksum: string;
          page_count: number;
          layout_report_json: string;
          created_at: string;
        }
      | undefined;

    if (!artifactRow) {
      return null;
    }

    const issueRows = this.connection
      .prepare(
        `SELECT id, build_id, section_id, block_id, type, severity, start_page, end_page, detail
         FROM layout_issues
         WHERE project_id = ? AND build_id = ?
         ORDER BY issue_order ASC, id ASC`
      )
      .all(projectId, buildId) as unknown as Array<{
      id: string;
      build_id: string;
      section_id: string | null;
      block_id: string | null;
      type: LayoutIssueType;
      severity: LayoutIssueSeverity;
      start_page: number;
      end_page: number;
      detail: string;
    }>;

    const artifact = createBuildArtifact({
      id: artifactRow.id,
      manifestId: artifactRow.manifest_id,
      docxPath: artifactRow.docx_path,
      pdfPreviewPath: artifactRow.pdf_preview_path,
      checksum: artifactRow.checksum,
      pageCount: artifactRow.page_count,
      layoutReport: JSON.parse(artifactRow.layout_report_json) as BuildLayoutReport,
      createdAt: artifactRow.created_at
    });

    const issues = issueRows.map((row) =>
      createLayoutIssue({
        id: row.id,
        buildId: row.build_id,
        sectionId: row.section_id,
        blockId: row.block_id,
        type: row.type,
        severity: row.severity,
        pageRange: [row.start_page, row.end_page],
        detail: row.detail
      })
    );

    return Object.freeze({
      artifact,
      issues: Object.freeze(issues)
    });
  }
}
