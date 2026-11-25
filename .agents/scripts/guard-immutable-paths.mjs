#!/usr/bin/env node
/**
 * PreToolUse safety hook cho Antigravity CLI (agy).
 * Nhận JSON camelCase từ stdin và trả JSON camelCase trên stdout:
 * - {"decision": "deny", "reason": "..."} khi công cụ định ghi đè/xóa tài sản bất biến:
 *   original.docx, template-sha256.txt, thư mục snapshot sources/, corpus/,
 *   docs/DOCFLOW_STUDIO_SPEC.md, docs/DocFlow_Interactive_Mockup.html, docs/mockup_*.png,
 *   hoặc khi vai trò AI chỉ đọc gọi công cụ ghi.
 * - {"decision": "force_ask", "reason": "..."} cho các lệnh hệ thống xóa đệ quy nhạy cảm.
 * - {"decision": "allow"} cho các thao tác hợp lệ khác.
 */

import fs from 'node:fs';
import path from 'node:path';

const READ_ONLY_AI_ROLES = new Set([
  'document-analyst',
  'source-analyst',
  'reviewer'
]);

const WRITE_LIKE_TOOLS = new Set([
  'write_file',
  'edit_file',
  'delete_file',
  'create_file',
  'replace_file_content',
  'multi_replace_file_content',
  'rename_file',
  'move_file'
]);

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function resolveCandidatePath(rawPath, baseCwd) {
  const trimmed = String(rawPath || '').trim();
  if (!trimmed) {
    return '';
  }
  const resolved = path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.resolve(baseCwd, trimmed);
  return normalizeSlashes(resolved);
}

/**
 * Kiểm tra một đường dẫn đã chuẩn hóa (dùng dấu '/') hoặc chuỗi tương đối có trỏ vào tài sản bất biến không.
 */
function checkImmutablePath(candidatePath, workspaceRoots) {
  const norm = normalizeSlashes(candidatePath).trim();
  if (!norm) {
    return null;
  }

  const lower = norm.toLowerCase();
  const base = path.posix.basename(lower);

  // 1. Bảo vệ Template V0 ở mọi thư mục dự án
  if (base === 'original.docx' || base === 'template-sha256.txt') {
    return `Tệp mẫu gốc '${ path.posix.basename(norm) }' (Template V0) là bất biến, tuyệt đối không được ghi đè hoặc xóa.`;
  }

  // 2. Bảo vệ đặc tả gốc & Prototype tham chiếu
  if (
    lower === 'docs/docflow_studio_spec.md' ||
    lower.endsWith('/docs/docflow_studio_spec.md') ||
    base === 'docflow_studio_spec.md'
  ) {
    return 'Tài liệu đặc tả gốc docs/DOCFLOW_STUDIO_SPEC.md là bất biến (chỉ đọc).';
  }

  if (
    lower === 'docs/docflow_interactive_mockup.html' ||
    lower.endsWith('/docs/docflow_interactive_mockup.html') ||
    base === 'docflow_interactive_mockup.html'
  ) {
    return 'Tệp Prototype tham chiếu docs/DocFlow_Interactive_Mockup.html bị khóa bảo vệ chống ghi đè ngoài ý muốn.';
  }

  if (/^mockup_.*\.png$/i.test(base) || /(^|\/)docs\/mockup_[^/]*\.png$/i.test(lower)) {
    return `Ảnh tham chiếu giao diện '${ path.posix.basename(norm) }' là bất biến, không được ghi đè hoặc xóa.`;
  }

  // 3. Bảo vệ thư mục snapshot nguồn dữ liệu (sources/)
  // Hỗ trợ cả đường dẫn tương đối kiểu "sources/...", "/.../sources/..." nhưng tránh chặn nhầm thư mục mã nguồn nếu có tên khác.
  if (
    /^sources(\/|$)/i.test(lower) ||
    /(^|\/)sources\/[^/]+/i.test(lower) ||
    lower.endsWith('/sources')
  ) {
    // Cho phép nếu là một thư mục mã nguồn rõ ràng bên trong app/src/ (nếu sau này có), nhưng chặn mọi snapshot dữ liệu sources/
    const isInsideAppSrc = /(^|\/)app\/src\//i.test(lower);
    if (!isInsideAppSrc) {
      return 'Thư mục Source Snapshot (sources/) là kho dữ liệu bất biến theo sha256, không được phép ghi đè hoặc xóa.';
    }
  }

  // 4. Bảo vệ kho tài liệu mẫu đo kiểm corpus/
  if (/^corpus(\/|$)/i.test(lower) || /(^|\/)corpus(\/|$)/i.test(lower)) {
    return 'Thư mục tài liệu mẫu kiểm thử (corpus/) ở chế độ chỉ đọc, không được ghi đè hoặc xóa.';
  }

  // 5. Bảo vệ các bản dựng lịch sử đã tồn tại trên đĩa (builds/<buildId>/manifest.json | output.docx)
  if (/(^|\/)builds\/[^/]+\/(manifest\.json|output\.docx)$/i.test(lower)) {
    try {
      if (fs.existsSync(candidatePath)) {
        return 'Bản dựng lịch sử (builds/<buildId>/manifest.json hoặc output.docx) đã chốt là bất biến; hãy tạo bản dựng mới thay vì ghi đè.';
      }
    } catch {
      // Bỏ qua lỗi kiểm tra fs
    }
  }

  // Kiểm tra thêm theo đường dẫn tương đối so với các workspaceRoot (nếu có)
  for (const root of workspaceRoots) {
    const normRoot = normalizeSlashes(root).replace(/\/+$/, '');
    if (normRoot && lower.startsWith(`${normRoot.toLowerCase()}/`)) {
      const rel = norm.slice(normRoot.length + 1);
      const relLower = rel.toLowerCase();
      if (
        relLower === 'docs/docflow_studio_spec.md' ||
        relLower === 'docs/docflow_interactive_mockup.html' ||
        /^docs\/mockup_.*\.png$/i.test(relLower) ||
        /^sources(\/|$)/i.test(relLower) ||
        /^corpus(\/|$)/i.test(relLower)
      ) {
        return `Đường dẫn '${rel}' thuộc danh mục tài sản bất biến được bảo vệ của dự án.`;
      }
    }
  }

  return null;
}

/**
 * Thu thập mọi giá trị chuỗi có khả năng là đường dẫn tệp trong args của toolCall.
 */
function extractPathCandidatesFromArgs(args) {
  if (!args || typeof args !== 'object') {
    return [];
  }
  const pathKeys = new Set([
    'path',
    'filepath',
    'file_path',
    'targetfile',
    'target_file',
    'targetpath',
    'target_path',
    'destination',
    'destinationpath',
    'destination_path',
    'dest',
    'to',
    'output',
    'outputpath',
    'output_path',
    'filename'
  ]);

  const results = [];
  const visit = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        visit(item);
      }
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (typeof val === 'string' && pathKeys.has(keyLower)) {
        results.push(val);
      } else if (Array.isArray(val) && (keyLower === 'paths' || keyLower === 'files')) {
        for (const item of val) {
          if (typeof item === 'string') {
            results.push(item);
          }
        }
      } else if (val && typeof val === 'object') {
        visit(val);
      }
    }
  };

  visit(args);
  return results;
}

/**
 * Phân tích câu lệnh shell trong run_command để chặn hành vi ghi/xóa/đổi tên lên đường dẫn bất biến
 * hoặc tự ý sửa đổi cấu hình hooks bảo vệ.
 */
function checkShellCommand(commandLine, baseCwd, workspaceRoots) {
  const cmd = String(commandLine || '').trim();
  if (!cmd) {
    return null;
  }

  const referencesProtectedTarget =
    /(^|[\s"'=/\\])(original\.docx|template-sha256\.txt|DOCFLOW_STUDIO_SPEC\.md|DocFlow_Interactive_Mockup\.html|mockup_[^\s"'/\\]*\.png)($|[\s"'])/i.test(
      cmd
    ) ||
    /(^|[\s"'=/\\])(sources|corpus)(\/|[\s"']|$)/i.test(cmd);

  // Phát hiện các lệnh có tác động ghi, xóa, di chuyển, ghi đè luồng hoặc sửa tại chỗ
  const hasMutatingShellPattern =
    /(^|[;&|]\s*|\s)(rm|mv|cp|dd|truncate|unlink|install|tee|touch|chmod|chown)\b/i.test(cmd) ||
    /\bsed\s+(-[^\s]*i|--in-place)\b/i.test(cmd) ||
    /\bperl\s+-[^\s]*i/i.test(cmd) ||
    /(^|[^0-9])>{1,2}\s*[^\s&|;]+/.test(cmd) ||
    /\b(writeFileSync|writeFile|unlinkSync|rmSync|copyFileSync|renameSync|createWriteStream|open\s*\([^)]*['"][wa+])/i.test(
      cmd
    ) ||
    /\bgit\s+(checkout|restore|clean|rm)\b/i.test(cmd);

  if (referencesProtectedTarget && hasMutatingShellPattern) {
    // Tách token để kiểm tra chính xác hơn nếu có đường dẫn cụ thể
    const tokens = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    for (const rawToken of tokens) {
      const cleaned = rawToken.replace(/^['">]+|['";,&|]+$/g, '');
      if (!cleaned || cleaned.startsWith('-')) {
        continue;
      }
      const resolved = resolveCandidatePath(cleaned, baseCwd);
      const reason =
        checkImmutablePath(cleaned, workspaceRoots) ||
        checkImmutablePath(resolved, workspaceRoots);
      if (reason) {
        return { decision: 'deny', reason: `VI PHẠM NGUYÊN TẮC BẤT BIẾN (run_command): ${reason}` };
      }
    }

    return {
      decision: 'deny',
      reason:
        'VI PHẠM NGUYÊN TẮC BẤT BIẾN (run_command): Phát hiện lệnh shell có thao tác ghi/sửa/xóa chạm tới tài sản bất biến (Template V0, Source Snapshot, corpus hoặc tài liệu/mockup gốc).'
    };
  }

  // Chặn lệnh shell tự ý xóa hoặc vô hiệu hóa hooks an toàn
  if (
    /\.agents\/(hooks\.json|scripts\/guard-immutable-paths\.mjs)/i.test(cmd) &&
    hasMutatingShellPattern
  ) {
    return {
      decision: 'deny',
      reason: 'Không được phép dùng lệnh shell để vô hiệu hóa hoặc ghi đè cấu hình safety hooks (.agents/hooks.json).'
    };
  }

  // Yêu cầu xác nhận trực tiếp từ người dùng đối với lệnh xóa đệ quy nguy hiểm
  if (/(^|[;&|]\s*)\s*rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b/.test(cmd)) {
    return {
      decision: 'force_ask',
      reason: 'Lệnh xóa đệ quy (rm -rf) có rủi ro cao — cần người dùng xác nhận trực tiếp.'
    };
  }

  return null;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
}

async function main() {
  let rawInput = '';
  try {
    rawInput = await readStdin();
  } catch (err) {
    respond({
      decision: 'deny',
      reason: `Không đọc được dữ liệu đầu vào của PreToolUse hook: ${err?.message || String(err)}`
    });
  }

  if (!rawInput || !rawInput.trim()) {
    respond({ decision: 'allow' });
  }

  let input;
  try {
    input = JSON.parse(rawInput);
  } catch {
    respond({
      decision: 'deny',
      reason: 'Payload JSON gửi tới PreToolUse hook không hợp lệ — từ chối thực thi để đảm bảo an toàn.'
    });
  }

  const baseCwd = typeof input.cwd === 'string' && input.cwd.trim() ? input.cwd : process.cwd();
  const workspaceRoots = Array.isArray(input.workspacePaths)
    ? input.workspacePaths.filter((p) => typeof p === 'string')
    : [baseCwd];

  const toolCall = input.toolCall || {};
  const toolName = String(toolCall.name || input.toolName || '').toLowerCase();
  const toolArgs =
    toolCall.args && typeof toolCall.args === 'object'
      ? toolCall.args
      : input.toolInput && typeof input.toolInput === 'object'
        ? input.toolInput
        : {};

  // 1. Cưỡng chế chế độ chỉ đọc nếu biến môi trường phiên đặt vai trò AI chỉ đọc
  const activeAiRole = String(process.env.DOCFLOW_AI_ROLE || '').trim().toLowerCase();
  if (
    READ_ONLY_AI_ROLES.has(activeAiRole) &&
    (WRITE_LIKE_TOOLS.has(toolName) || toolName === 'run_command')
  ) {
    respond({
      decision: 'deny',
      reason: `Vai trò AI '${activeAiRole}' chỉ có quyền đọc (Read-Only Capability Scoping), không được phép gọi '${toolName}'.`
    });
  }

  // 2. Kiểm tra các công cụ ghi/sửa/xóa file trực tiếp hoặc MCP tool có truyền đường dẫn
  if (WRITE_LIKE_TOOLS.has(toolName) || toolName === 'call_mcp_tool') {
    const rawPaths = extractPathCandidatesFromArgs(toolArgs);

    // Nếu là call_mcp_tool, chặn các tool phê duyệt/xuất file nếu được gọi qua MCP không hợp lệ
    if (toolName === 'call_mcp_tool') {
      const mcpToolName = String(toolArgs.ToolName || toolArgs.toolName || '').toLowerCase();
      if (
        activeAiRole &&
        (mcpToolName.includes('approve') || mcpToolName.includes('export_docx') || mcpToolName.includes('exportdocx'))
      ) {
        respond({
          decision: 'deny',
          reason: 'AI Agent không được phép gọi công cụ phê duyệt chính thức hoặc xuất tài liệu DOCX.'
        });
      }
    }

    for (const candidate of rawPaths) {
      const resolved = resolveCandidatePath(candidate, baseCwd);
      const violation =
        checkImmutablePath(candidate, workspaceRoots) ||
        checkImmutablePath(resolved, workspaceRoots);

      if (violation) {
        respond({
          decision: 'deny',
          reason: `VI PHẠM NGUYÊN TẮC BẤT BIẾN: ${violation}`
        });
      }
    }
  }

  // 3. Kiểm tra câu lệnh shell đối với run_command
  if (toolName === 'run_command' || toolName === 'bash' || toolName === 'execute_command') {
    const commandLine =
      toolArgs.CommandLine ?? toolArgs.commandLine ?? toolArgs.command ?? toolArgs.cmd ?? '';
    const shellCheck = checkShellCommand(commandLine, baseCwd, workspaceRoots);
    if (shellCheck) {
      respond(shellCheck);
    }
  }

  respond({ decision: 'allow' });
}

main();
