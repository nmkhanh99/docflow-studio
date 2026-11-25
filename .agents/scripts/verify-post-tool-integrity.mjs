#!/usr/bin/env node
/**
 * PostToolUse hook cho Antigravity CLI (agy).
 * Đọc ngữ cảnh thực thi từ stdin (camelCase) và trả về đối tượng JSON rỗng {} theo đúng hợp đồng PostToolUse.
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
    // Bỏ qua nếu không đọc được stdin
  }

  process.stdout.write('{}\n');
}

main();
