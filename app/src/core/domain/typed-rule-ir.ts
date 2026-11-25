import { AppError, type DocFlowErrorCode } from './errors';
import {
  assertNonEmptyText,
  assertNonNegativeInteger,
  isValidDecimalString,
  type DecimalString,
  type RoundingMode
} from './value-objects';

/**
 * Lược đồ kế hoạch thực thi có kiểu (Typed Rule IR) 4 bước theo DOCFLOW_STUDIO_SPEC.md §5.1 & §6.1–6.4.
 * TUYỆT ĐỐI CẤM `eval()`, `new Function()`, script tùy ý ngoài sandbox hoặc macro Office/VBA.
 */

export type RuleScalarDataType =
  | 'DECIMAL'
  | 'INTEGER'
  | 'TEXT'
  | 'DATE'
  | 'PERCENTAGE'
  | 'BOOLEAN';

export type RuleInputType = RuleScalarDataType | 'TABULAR';

export interface RuleInputDeclaration {
  readonly ref: string;
  readonly type: RuleInputType;
  readonly unit?: string | null;
  readonly versionPolicy?: 'PINNED_SNAPSHOT' | 'EXPLICIT_REVISION';
  readonly required?: boolean;
}

export interface RuleOutputDeclaration {
  readonly key: string;
  readonly type: RuleScalarDataType;
  readonly unit?: string | null;
  readonly scale?: number;
  readonly roundingMode?: RoundingMode;
}

export interface TypedRuleIoSchema {
  readonly inputs: readonly RuleInputDeclaration[];
  readonly outputs: readonly RuleOutputDeclaration[];
}

// --- Biểu thức số học & logic dạng cây AST có kiểu (thay thế hoàn toàn chuỗi eval) ---

export type ArithmeticOperator = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE';
export type ComparisonOperator = 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE';
export type LogicalOperator = 'AND' | 'OR';

export type TypedExpressionNode =
  | { readonly kind: 'LITERAL_DECIMAL'; readonly value: DecimalString }
  | { readonly kind: 'LITERAL_INTEGER'; readonly value: number }
  | { readonly kind: 'LITERAL_TEXT'; readonly value: string }
  | { readonly kind: 'LITERAL_BOOLEAN'; readonly value: boolean }
  | { readonly kind: 'INPUT_REF'; readonly ref: string }
  | {
      readonly kind: 'BINARY_ARITHMETIC';
      readonly operator: ArithmeticOperator;
      readonly left: TypedExpressionNode;
      readonly right: TypedExpressionNode;
      readonly divideScale?: number;
      readonly roundingMode?: RoundingMode;
    }
  | {
      readonly kind: 'ROUND';
      readonly operand: TypedExpressionNode;
      readonly scale: number;
      readonly roundingMode: RoundingMode;
    }
  | {
      readonly kind: 'CONDITIONAL';
      readonly condition: TypedConditionNode;
      readonly whenTrue: TypedExpressionNode;
      readonly whenFalse: TypedExpressionNode;
    };

export type TypedConditionNode =
  | {
      readonly kind: 'COMPARISON';
      readonly operator: ComparisonOperator;
      readonly left: TypedExpressionNode;
      readonly right: TypedExpressionNode;
    }
  | {
      readonly kind: 'LOGICAL';
      readonly operator: LogicalOperator;
      readonly operands: readonly TypedConditionNode[];
    };

export type LookupTieBreakPolicy =
  | 'ERROR_ON_TIE'
  | 'LATEST_EFFECTIVE_DATE_ERROR_ON_TIE'
  | 'EXPLICIT_PRIORITY';

export type ValidationCheckKind =
  | 'NON_NEGATIVE'
  | 'POSITIVE'
  | 'CURRENCY_UNIT_MATCH'
  | 'SOURCE_ROW_EXISTS'
  | 'UNIQUE_EFFECTIVE_RECORD';

// --- 4 bước tách biệt của Typed Rule IR (§6.2) ---

export interface DataExtractionStep {
  readonly kind: 'DATA_EXTRACTION';
  readonly stepId: string;
  readonly sourceRef: string;
  readonly bindingId?: string;
  readonly outputAlias: string;
  readonly selectedColumns: readonly string[];
}

export interface RelationalTransformStep {
  readonly kind: 'RELATIONAL_TRANSFORM';
  readonly stepId: string;
  readonly operation: 'FILTER' | 'JOIN' | 'RESOLVE_EFFECTIVE_DATE' | 'GROUP_AGGREGATE';
  readonly inputAlias: string;
  readonly joinWithAlias?: string;
  readonly condition?: TypedConditionNode;
  readonly effectiveDateColumn?: string;
  readonly referenceDateRef?: string;
  readonly tieBreakPolicy: LookupTieBreakPolicy;
  readonly outputAlias: string;
}

export interface DeterministicCalculationStep {
  readonly kind: 'DETERMINISTIC_CALCULATION';
  readonly stepId: string;
  readonly outputKey: string;
  readonly expression: TypedExpressionNode;
  readonly unit: string | null;
  readonly scale: number;
  readonly roundingMode: RoundingMode;
  readonly checks: readonly ValidationCheckKind[];
}

export interface NarrativeRewriteStep {
  readonly kind: 'NARRATIVE_REWRITE';
  readonly stepId: string;
  readonly targetSectionId: string;
  readonly allowedBlockIds: readonly string[];
  readonly referencedOutputKeys: readonly string[];
  readonly policy: 'PRESERVE_STRUCTURE_AND_STYLES';
}

export type TypedRuleStep =
  | DataExtractionStep
  | RelationalTransformStep
  | DeterministicCalculationStep
  | NarrativeRewriteStep;

export interface TypedRuleExecutionPlan {
  readonly irVersion: '1.0';
  readonly steps: readonly TypedRuleStep[];
}

export interface TypedRuleTestCase {
  readonly id: string;
  readonly description: string;
  readonly inputs: Readonly<Record<string, DecimalString | string | number | boolean | null>>;
  readonly expectedOutputs?: Readonly<Record<string, DecimalString | string | number | boolean>>;
  readonly expectedErrorCode?: DocFlowErrorCode;
}

export type HumanReviewTrigger =
  | 'AMBIGUOUS_MATCH'
  | 'MISSING_DATA'
  | 'NARRATIVE_CHANGE'
  | 'OVERRIDE_CONFLICT';

const FORBIDDEN_DYNAMIC_EXECUTION_PATTERNS: readonly RegExp[] = [
  /\beval\s*\(/i,
  /\bnew\s+Function\b/i,
  /\bFunction\s*\(/i,
  /\bsetTimeout\s*\(\s*['"`]/i,
  /\bsetInterval\s*\(\s*['"`]/i,
  /\bchild_process\b/i,
  /\bActiveXObject\b/i,
  /\bCreateObject\s*\(/i,
  /\bVBA\b/i,
  /\bAuto_Open\b/i,
  /\bWorkbook_Open\b/i
];

export function assertNoDynamicCodeOrMacro(textValue: string, fieldPath: string): void {
  for (const pattern of FORBIDDEN_DYNAMIC_EXECUTION_PATTERNS) {
    if (pattern.test(textValue)) {
      throw new AppError({
        code: 'RULE_SCHEMA_INVALID',
        message: `Phát hiện cú pháp thực thi động hoặc macro bị cấm tại '${fieldPath}'. Rule bắt buộc dùng Typed IR tất định, cấm eval()/Function()/macro.`,
        details: {
          fieldPath,
          matchedPattern: pattern.source
        },
        recoverable: true
      });
    }
  }
}

function validateExpressionNode(node: TypedExpressionNode, path: string): void {
  switch (node.kind) {
    case 'LITERAL_DECIMAL':
      assertNoDynamicCodeOrMacro(node.value, `${path}.value`);
      if (!isValidDecimalString(node.value)) {
        throw new AppError({
          code: 'RULE_SCHEMA_INVALID',
          message: `Hằng số thập phân '${node.value}' tại '${path}' không hợp lệ.`,
          details: { path, value: node.value },
          recoverable: true
        });
      }
      return;
    case 'LITERAL_INTEGER':
      if (!Number.isSafeInteger(node.value)) {
        throw new AppError({
          code: 'RULE_SCHEMA_INVALID',
          message: `Hằng số nguyên tại '${path}' phải là số nguyên an toàn (cấm số chấm động IEEE-754 thô).`,
          details: { path, value: node.value },
          recoverable: true
        });
      }
      return;
    case 'LITERAL_TEXT':
      assertNoDynamicCodeOrMacro(node.value, `${path}.value`);
      return;
    case 'LITERAL_BOOLEAN':
      return;
    case 'INPUT_REF':
      assertNonEmptyText(node.ref, `${path}.ref`);
      assertNoDynamicCodeOrMacro(node.ref, `${path}.ref`);
      return;
    case 'BINARY_ARITHMETIC':
      validateExpressionNode(node.left, `${path}.left`);
      validateExpressionNode(node.right, `${path}.right`);
      if (node.divideScale !== undefined) {
        assertNonNegativeInteger(node.divideScale, `${path}.divideScale`);
      }
      return;
    case 'ROUND':
      assertNonNegativeInteger(node.scale, `${path}.scale`);
      validateExpressionNode(node.operand, `${path}.operand`);
      return;
    case 'CONDITIONAL':
      validateConditionNode(node.condition, `${path}.condition`);
      validateExpressionNode(node.whenTrue, `${path}.whenTrue`);
      validateExpressionNode(node.whenFalse, `${path}.whenFalse`);
      return;
  }
}

function validateConditionNode(condition: TypedConditionNode, path: string): void {
  if (condition.kind === 'COMPARISON') {
    validateExpressionNode(condition.left, `${path}.left`);
    validateExpressionNode(condition.right, `${path}.right`);
    return;
  }
  if (condition.operands.length === 0) {
    throw new AppError({
      code: 'RULE_SCHEMA_INVALID',
      message: `Điều kiện logic '${condition.operator}' tại '${path}' phải có ít nhất một toán hạng.`,
      details: { path },
      recoverable: true
    });
  }
  condition.operands.forEach((op, idx) => validateConditionNode(op, `${path}.operands[${idx}]`));
}

/**
 * Kiểm tra toàn diện tính hợp lệ của `TypedRuleIoSchema` và `TypedRuleExecutionPlan` (không eval, đủ kiểu/đơn vị/bước).
 */
export function validateTypedRulePlan(
  ioSchema: TypedRuleIoSchema,
  executionPlan: TypedRuleExecutionPlan
): void {
  if (executionPlan.irVersion !== '1.0') {
    throw new AppError({
      code: 'RULE_SCHEMA_INVALID',
      message: `Phiên bản Typed Rule IR '${String(executionPlan.irVersion)}' không được hỗ trợ.`,
      details: { irVersion: executionPlan.irVersion },
      recoverable: true
    });
  }

  if (executionPlan.steps.length === 0) {
    throw new AppError({
      code: 'RULE_SCHEMA_INVALID',
      message: 'Kế hoạch thực thi Typed Rule IR phải có ít nhất một bước xử lý hợp lệ.',
      recoverable: true
    });
  }

  for (const [idx, inputDecl] of ioSchema.inputs.entries()) {
    assertNonEmptyText(inputDecl.ref, `ioSchema.inputs[${idx}].ref`);
    assertNoDynamicCodeOrMacro(inputDecl.ref, `ioSchema.inputs[${idx}].ref`);
  }

  const declaredOutputs = new Set<string>();
  for (const [idx, outputDecl] of ioSchema.outputs.entries()) {
    const key = assertNonEmptyText(outputDecl.key, `ioSchema.outputs[${idx}].key`);
    assertNoDynamicCodeOrMacro(key, `ioSchema.outputs[${idx}].key`);
    if (declaredOutputs.has(key)) {
      throw new AppError({
        code: 'RULE_SCHEMA_INVALID',
        message: `Đầu ra '${key}' bị khai báo trùng lặp trong ioSchema.outputs.`,
        details: { outputKey: key },
        recoverable: true
      });
    }
    declaredOutputs.add(key);
  }

  const stepIds = new Set<string>();
  const computedOutputKeys = new Set<string>();

  for (const [idx, step] of executionPlan.steps.entries()) {
    const stepPath = `executionPlan.steps[${idx}]`;
    const stepId = assertNonEmptyText(step.stepId, `${stepPath}.stepId`);
    if (stepIds.has(stepId)) {
      throw new AppError({
        code: 'RULE_SCHEMA_INVALID',
        message: `Mã bước '${stepId}' bị trùng lặp trong kế hoạch thực thi Rule.`,
        details: { stepId },
        recoverable: true
      });
    }
    stepIds.add(stepId);

    switch (step.kind) {
      case 'DATA_EXTRACTION':
        assertNonEmptyText(step.sourceRef, `${stepPath}.sourceRef`);
        assertNonEmptyText(step.outputAlias, `${stepPath}.outputAlias`);
        if (step.selectedColumns.length === 0) {
          throw new AppError({
            code: 'RULE_SCHEMA_INVALID',
            message: `Bước trích xuất dữ liệu '${stepId}' phải chỉ rõ ít nhất một cột cần đọc.`,
            details: { stepId },
            recoverable: true
          });
        }
        break;
      case 'RELATIONAL_TRANSFORM':
        assertNonEmptyText(step.inputAlias, `${stepPath}.inputAlias`);
        assertNonEmptyText(step.outputAlias, `${stepPath}.outputAlias`);
        if (step.condition) {
          validateConditionNode(step.condition, `${stepPath}.condition`);
        }
        break;
      case 'DETERMINISTIC_CALCULATION': {
        const outKey = assertNonEmptyText(step.outputKey, `${stepPath}.outputKey`);
        if (step.scale < 0 || !Number.isInteger(step.scale)) {
          throw new AppError({
            code: 'RULE_SCHEMA_INVALID',
            message: `Bước tính toán '${stepId}' có scale không hợp lệ (${String(step.scale)}).`,
            details: { stepId, scale: step.scale },
            recoverable: true
          });
        }
        validateExpressionNode(step.expression, `${stepPath}.expression`);
        computedOutputKeys.add(outKey);
        break;
      }
      case 'NARRATIVE_REWRITE':
        assertNonEmptyText(step.targetSectionId, `${stepPath}.targetSectionId`);
        if (step.allowedBlockIds.length === 0) {
          throw new AppError({
            code: 'RULE_SCHEMA_INVALID',
            message: `Bước viết lại nhận xét '${stepId}' phải giới hạn danh sách allowedBlockIds trong Section đích.`,
            details: { stepId },
            recoverable: true
          });
        }
        for (const refKey of step.referencedOutputKeys) {
          if (!computedOutputKeys.has(refKey) && !declaredOutputs.has(refKey)) {
            throw new AppError({
              code: 'RULE_SCHEMA_INVALID',
              message: `Bước viết lại nhận xét '${stepId}' tham chiếu tới con số '${refKey}' chưa được tính toán tất định (cấm LLM tự nhẩm tính).`,
              details: { stepId, missingOutputKey: refKey },
              recoverable: true
            });
          }
        }
        break;
    }
  }
}
