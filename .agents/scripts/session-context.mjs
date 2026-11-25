#!/usr/bin/env node
/**
 * SessionStart hook cho Antigravity CLI (agy).
 * Tiêm ngữ cảnh nhắc nhở quy tắc bất biến của DocFlow Studio (khóa camelCase).
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  try {
    await readStdin();
  } catch {
    // Bỏ qua nếu stdin rỗng
  }

  const role = process.env.DOCFLOW_AI_ROLE;
  const roleNote = role ? ` (Vai trò AI hiện tại: ${role})` : '';

  const response = {
    injectSteps: [
      {
        systemMessage: {
          systemMessage:
            `Chế độ bảo vệ bất biến DocFlow Studio đang bật${roleNote}: ` +
            'Tuyệt đối không ghi đè hoặc xóa original.docx, template-sha256.txt, thư mục snapshot sources/, corpus/, ' +
            'docs/DOCFLOW_STUDIO_SPEC.md, docs/DocFlow_Interactive_Mockup.html và docs/mockup_*.png.'
        }
      }
    ]
  };

  process.stdout.write(`${JSON.stringify(response)}\n`);
}

main();
