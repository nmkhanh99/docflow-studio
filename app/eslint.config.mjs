import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'dist-electron/**', 'node_modules/**', 'coverage/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ]
    }
  },
  {
    // Ràng buộc kiến trúc 1: app/src/core/** hoàn toàn tinh khiết (Zero Infrastructure Dependency)
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'Lớp core/ cấm import electron.' },
            { name: 'react', message: 'Lớp core/ cấm import react.' },
            { name: 'react-dom', message: 'Lớp core/ cấm import react-dom.' },
            { name: 'zustand', message: 'Lớp core/ cấm import zustand.' },
            { name: 'better-sqlite3', message: 'Lớp core/ cấm import better-sqlite3.' },
            { name: 'fs', message: 'Lớp core/ cấm import fs trực tiếp; hãy dùng Port.' },
            { name: 'node:fs', message: 'Lớp core/ cấm import node:fs trực tiếp; hãy dùng Port.' },
            { name: 'fs/promises', message: 'Lớp core/ cấm import fs/promises trực tiếp; hãy dùng Port.' },
            { name: 'node:fs/promises', message: 'Lớp core/ cấm import node:fs/promises trực tiếp; hãy dùng Port.' },
            { name: 'path', message: 'Lớp core/ cấm import path phụ thuộc OS.' },
            { name: 'node:path', message: 'Lớp core/ cấm import node:path phụ thuộc OS.' },
            { name: 'child_process', message: 'Lớp core/ cấm import child_process.' },
            { name: 'node:child_process', message: 'Lớp core/ cấm import node:child_process.' }
          ],
          patterns: [
            {
              group: ['@ui/*', '../ui/*', '../../ui/*', '../../../ui/*'],
              message: 'Lớp core/ cấm phụ thuộc ngược ra lớp ui/.'
            },
            {
              group: ['@adapters/*', '../adapters/*', '../../adapters/*', '../../../adapters/*'],
              message: 'Lớp core/ cấm import trực tiếp từ adapters/; hãy định nghĩa interface tại core/ports/.'
            },
            {
              group: ['@infra/*', '../infra/*', '../../infra/*', '../../../infra/*'],
              message: 'Lớp core/ cấm import trực tiếp từ infra/; hãy định nghĩa interface tại core/ports/.'
            },
            {
              group: ['@preload/*', '../preload/*', '../../preload/*', '../main/*', '../../main/*'],
              message: 'Lớp core/ cấm import từ main/ hoặc preload/.'
            }
          ]
        }
      ]
    }
  },
  {
    // Ràng buộc kiến trúc 2: app/src/ui/** chỉ giao tiếp qua window.docflowApi (contextBridge)
    files: ['src/ui/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'Lớp ui/ chạy trong sandbox, cấm import electron trực tiếp.' },
            { name: 'better-sqlite3', message: 'Lớp ui/ cấm import better-sqlite3.' },
            { name: 'fs', message: 'Lớp ui/ cấm import Node fs.' },
            { name: 'node:fs', message: 'Lớp ui/ cấm import node:fs.' },
            { name: 'child_process', message: 'Lớp ui/ cấm import child_process.' },
            { name: 'node:child_process', message: 'Lớp ui/ cấm import node:child_process.' }
          ],
          patterns: [
            {
              group: ['@adapters/*', '../adapters/*', '../../adapters/*', '../../../adapters/*'],
              message: 'Lớp ui/ cấm gọi trực tiếp adapters/; phải đi qua preload/IPC.'
            },
            {
              group: ['@infra/*', '../infra/*', '../../infra/*', '../../../infra/*'],
              message: 'Lớp ui/ cấm gọi trực tiếp infra/; phải đi qua preload/IPC.'
            },
            {
              group: ['../main/*', '../../main/*', '../../../main/*'],
              message: 'Lớp ui/ cấm import từ main/.'
            }
          ]
        }
      ]
    }
  }
);
