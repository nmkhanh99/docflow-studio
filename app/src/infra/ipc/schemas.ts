import { z } from 'zod';
import type { IpcChannelSpec } from './types';
import { entityIdSchema, nonEmptyTextSchema, safeFilePathSchema } from './validators';

export const DOCFLOW_IPC_CHANNELS = [
  'system.ping',
  // 1. Dự án & Nguồn
  'project.create',
  'project.open',
  'project.importTemplate',
  'project.addSource',
  // 2. Section & Định vị
  'section.list',
  'section.get',
  'section.resolveAnchor',
  'section.updateBoundaries',
  // 3. Yêu cầu sửa
  'change.create',
  // 4. Quy tắc (Rule)
  'rule.proposeFromInstruction',
  'rule.validate',
  'rule.saveVersion',
  'rule.test',
  // 5. Phụ thuộc & Chạy
  'dependency.analyze',
  'run.plan',
  'run.execute',
  'run.cancel',
  'run.getEvidence',
  // 6. Revision & Duyệt
  'section.saveRevision',
  'section.approveRevision',
  // 7. Build & Xuất
  'build.validate',
  'build.renderPreview',
  'build.inspectLayout',
  'build.approve',
  'build.exportDocx',
  // 8. Lịch sử & Nhánh
  'history.list',
  'history.openSnapshot',
  'history.branchFromSnapshot'
] as const;

export type DocFlowIpcChannel = (typeof DOCFLOW_IPC_CHANNELS)[number];

const patchCommandSchema = z
  .object({
    blockId: entityIdSchema,
    op: z.enum([
      'replaceText',
      'replaceRuns',
      'setCellValue',
      'insertParagraphAfter',
      'removeBlock',
      'replaceTableRows',
      'replaceImage',
      'setStyle'
    ]),
    payload: z.record(z.unknown())
  })
  .strict();

export const IPC_CHANNEL_SPECS: Readonly<Record<DocFlowIpcChannel, IpcChannelSpec>> = {
  'system.ping': {
    channel: 'system.ping',
    descriptionVi: 'Kiểm tra kết nối IPC và thông tin kiến trúc ứng dụng',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        echo: z.string().max(256).optional()
      })
      .strict()
      .default({})
  },
  'project.create': {
    channel: 'project.create',
    descriptionVi: 'Khởi tạo không gian dự án DocFlow Studio mới',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        projectDir: safeFilePathSchema,
        title: z.string().trim().min(1, 'Tên dự án không được để trống.').max(200)
      })
      .strict()
  },
  'project.open': {
    channel: 'project.open',
    descriptionVi: 'Mở dự án DocFlow Studio hiện có trên máy trạm',
    requiredCapabilities: ['ui:user'],
    mutating: false,
    inputSchema: z
      .object({
        projectDir: safeFilePathSchema
      })
      .strict()
  },
  'project.importTemplate': {
    channel: 'project.importTemplate',
    descriptionVi: 'Nhập tài liệu mẫu DOCX gốc vào kho bất biến Template V0 (sha256)',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        filePath: safeFilePathSchema
      })
      .strict()
  },
  'project.addSource': {
    channel: 'project.addSource',
    descriptionVi: 'Nhập tệp nguồn Excel/DOCX/PDF vào kho bất biến Source Snapshot (sha256)',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        filePath: safeFilePathSchema,
        sourceKey: entityIdSchema.optional(),
        type: z.enum(['EXCEL', 'DOCX', 'PDF', 'CSV']).optional()
      })
      .strict()
  },
  'section.list': {
    channel: 'section.list',
    descriptionVi: 'Liệt kê danh sách Logical Section của dự án',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        projectId: entityIdSchema
      })
      .strict()
  },
  'section.get': {
    channel: 'section.get',
    descriptionVi: 'Đọc chi tiết một Logical Section kèm cây DocumentBlock',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        sectionId: entityIdSchema,
        includeBlocks: z.boolean().optional()
      })
      .strict()
  },
  'section.resolveAnchor': {
    channel: 'section.resolveAnchor',
    descriptionVi: 'Kiểm tra và phân giải neo OOXML của Logical Section hoặc DocumentBlock',
    requiredCapabilities: ['ui:user', 'agent:doc-analyst'],
    mutating: false,
    inputSchema: z
      .object({
        sectionId: entityIdSchema.optional(),
        blockId: entityIdSchema.optional()
      })
      .strict()
      .refine((v) => Boolean(v.sectionId || v.blockId), {
        message: 'Phải cung cấp ít nhất sectionId hoặc blockId để phân giải neo.'
      })
  },
  'section.updateBoundaries': {
    channel: 'section.updateBoundaries',
    descriptionVi: 'Cập nhật ranh giới startAnchor/endAnchor cho Logical Section',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        sectionId: entityIdSchema,
        startAnchor: nonEmptyTextSchema,
        endAnchor: nonEmptyTextSchema,
        title: z.string().trim().min(1).max(200).optional()
      })
      .strict()
  },
  'change.create': {
    channel: 'change.create',
    descriptionVi: 'Tạo yêu cầu chỉnh sửa (ChangeRequest) gắn với Logical Section',
    requiredCapabilities: ['ui:user', 'agent:orchestrator'],
    mutating: true,
    inputSchema: z
      .object({
        sectionId: entityIdSchema,
        instruction: nonEmptyTextSchema,
        scope: z.enum(['SINGLE_SECTION', 'DOWNSTREAM']),
        changeKind: z.enum(['DIRECT_VALUE', 'TEXT_EDIT', 'RULE_UPDATE', 'STRUCTURE_EDIT'])
      })
      .strict()
  },
  'rule.proposeFromInstruction': {
    channel: 'rule.proposeFromInstruction',
    descriptionVi: 'Đề xuất bản nháp Typed Rule IR từ mô tả nghiệp vụ',
    requiredCapabilities: ['ui:user', 'agent:rule-planner'],
    mutating: true,
    inputSchema: z
      .object({
        sectionId: entityIdSchema,
        instruction: nonEmptyTextSchema,
        sourceHints: z.array(entityIdSchema).max(20).optional()
      })
      .strict()
  },
  'rule.validate': {
    channel: 'rule.validate',
    descriptionVi: 'Kiểm tra lược đồ kiểu dữ liệu, đơn vị và chu trình DAG cho bản nháp Rule',
    requiredCapabilities: ['ui:user', 'agent:rule-planner'],
    mutating: false,
    inputSchema: z
      .object({
        ruleDraft: z.record(z.unknown())
      })
      .strict()
  },
  'rule.saveVersion': {
    channel: 'rule.saveVersion',
    descriptionVi: 'Lưu phiên bản SavedRule mới vào Recipe của dự án',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        ruleId: entityIdSchema,
        validatedRule: z.record(z.unknown()),
        persistenceKind: z.enum(['REUSABLE_RULE', 'ONE_OFF_CHANGE'])
      })
      .strict()
  },
  'rule.test': {
    channel: 'rule.test',
    descriptionVi: 'Chạy thử SavedRule trong sandbox tất định kèm bằng chứng provenance',
    requiredCapabilities: ['ui:user', 'agent:rule-planner', 'agent:reviewer'],
    mutating: false,
    inputSchema: z
      .object({
        ruleId: entityIdSchema,
        version: z.number().int().positive().optional(),
        testCases: z.array(z.record(z.unknown())).max(50).optional()
      })
      .strict()
  },
  'dependency.analyze': {
    channel: 'dependency.analyze',
    descriptionVi: 'Phân tích phạm vi ảnh hưởng trên đồ thị phụ thuộc DAG',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        changedNodes: z.array(entityIdSchema).min(1, 'Cần ít nhất một nút thay đổi để phân tích.').max(200)
      })
      .strict()
  },
  'run.plan': {
    channel: 'run.plan',
    descriptionVi: 'Lập kế hoạch chạy Selected / Affected / Full trên đồ thị phụ thuộc',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        mode: z.enum(['SELECTED', 'AFFECTED', 'FULL']),
        sectionId: entityIdSchema.optional()
      })
      .strict()
      .refine((v) => (v.mode === 'SELECTED' ? Boolean(v.sectionId) : true), {
        message: 'Chế độ chạy SELECTED bắt buộc phải truyền sectionId.'
      })
  },
  'run.execute': {
    channel: 'run.execute',
    descriptionVi: 'Thực thi kế hoạch tính toán trong sandbox tất định',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        planId: entityIdSchema
      })
      .strict()
  },
  'run.cancel': {
    channel: 'run.cancel',
    descriptionVi: 'Hủy phiên thực thi đang chạy',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        runId: entityIdSchema
      })
      .strict()
  },
  'run.getEvidence': {
    channel: 'run.getEvidence',
    descriptionVi: 'Truy xuất bằng chứng tính toán (RunStep evidence & provenance)',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        runId: entityIdSchema,
        stepId: entityIdSchema.optional()
      })
      .strict()
  },
  'section.saveRevision': {
    channel: 'section.saveRevision',
    descriptionVi: 'Lưu đề xuất SectionRevision ở trạng thái nháp hoặc chờ duyệt',
    requiredCapabilities: ['ui:user', 'agent:section-writer'],
    mutating: true,
    inputSchema: z
      .object({
        sectionId: entityIdSchema,
        patchSet: z.array(patchCommandSchema).min(1, 'Danh sách lệnh vá OOXML không được rỗng.'),
        sourceRunId: entityIdSchema.optional()
      })
      .strict()
  },
  'section.approveRevision': {
    channel: 'section.approveRevision',
    descriptionVi: 'Người dùng phê duyệt SectionRevision (cấm mọi AI Agent)',
    requiredCapabilities: ['ui:user'],
    humanOnly: true,
    mutating: true,
    inputSchema: z
      .object({
        revisionId: entityIdSchema.optional(),
        approveAllPending: z.boolean().optional()
      })
      .strict()
      .refine((v) => Boolean(v.revisionId || v.approveAllPending === true), {
        message: 'Phải truyền revisionId cụ thể hoặc approveAllPending = true.'
      })
  },
  'build.validate': {
    channel: 'build.validate',
    descriptionVi: 'Kiểm tra cổng chất lượng Build Gate (stale, phê duyệt, toàn vẹn hash)',
    requiredCapabilities: ['ui:user', 'agent:reviewer'],
    mutating: false,
    inputSchema: z
      .object({
        manifestDraft: z.record(z.unknown())
      })
      .strict()
  },
  'build.renderPreview': {
    channel: 'build.renderPreview',
    descriptionVi: 'Kết xuất bản xem trước toàn tài liệu và tách Content Diff / Layout Diff',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        manifestId: entityIdSchema,
        layoutPolicy: z.record(z.unknown()).optional()
      })
      .strict()
  },
  'build.inspectLayout': {
    channel: 'build.inspectLayout',
    descriptionVi: 'Kiểm tra báo cáo phân trang, font và danh sách LayoutIssue',
    requiredCapabilities: ['ui:user', 'agent:reviewer'],
    mutating: false,
    inputSchema: z
      .object({
        buildId: entityIdSchema
      })
      .strict()
  },
  'build.approve': {
    channel: 'build.approve',
    descriptionVi: 'Người dùng phê duyệt bản dựng tài liệu (cấm mọi AI Agent)',
    requiredCapabilities: ['ui:user'],
    humanOnly: true,
    mutating: true,
    inputSchema: z
      .object({
        buildId: entityIdSchema,
        overrideReason: z.string().trim().min(5).max(1000).optional()
      })
      .strict()
  },
  'build.exportDocx': {
    channel: 'build.exportDocx',
    descriptionVi: 'Xuất tài liệu DOCX hoàn chỉnh từ BuildManifest đã duyệt (cấm mọi AI Agent)',
    requiredCapabilities: ['ui:user'],
    humanOnly: true,
    mutating: true,
    inputSchema: z
      .object({
        buildId: entityIdSchema,
        destinationPath: safeFilePathSchema
      })
      .strict()
  },
  'history.list': {
    channel: 'history.list',
    descriptionVi: 'Xem dòng thời gian kiểm toán và lịch sử phiên bản dự án',
    requiredCapabilities: ['ui:user', 'agent:read'],
    mutating: false,
    inputSchema: z
      .object({
        filterKind: z.string().trim().max(64).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().trim().max(128).optional()
      })
      .strict()
      .default({})
  },
  'history.openSnapshot': {
    channel: 'history.openSnapshot',
    descriptionVi: 'Mở lại Build Snapshot lịch sử theo đúng các mã băm đã ghim',
    requiredCapabilities: ['ui:user'],
    mutating: false,
    inputSchema: z
      .object({
        buildId: entityIdSchema
      })
      .strict()
  },
  'history.branchFromSnapshot': {
    channel: 'history.branchFromSnapshot',
    descriptionVi: 'Tạo nhánh chỉnh sửa mới từ Build Snapshot cũ mà không ghi đè lịch sử',
    requiredCapabilities: ['ui:user'],
    mutating: true,
    inputSchema: z
      .object({
        buildId: entityIdSchema,
        newBranchTitle: z.string().trim().min(1, 'Tên nhánh mới không được để trống.').max(200)
      })
      .strict()
  }
};

export function isAllowedIpcChannel(channel: string): channel is DocFlowIpcChannel {
  return Object.prototype.hasOwnProperty.call(IPC_CHANNEL_SPECS, channel);
}
