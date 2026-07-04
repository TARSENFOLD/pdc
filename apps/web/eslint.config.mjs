import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import noLegacyPrimitives from './eslint-rules/no-legacy-primitives.js';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // ── Calm Authority lint gate ─────────────────────────────────────────────
  // Enforces the quiet primitive layer stays free of legacy loud primitives.
  // Applied to quiet/ and shells/ now; expands to all src/ in T19.
  {
    files: [
      'src/components/ui/quiet/**/*.{ts,tsx}',
      'src/components/ui/shells/**/*.{ts,tsx}',
      'src/pages/_dev/**/*.{ts,tsx}',
    ],
    plugins: {
      'calm-authority': { rules: { 'no-legacy-primitives': noLegacyPrimitives } },
    },
    rules: {
      'calm-authority/no-legacy-primitives': 'error',
    },
  },
);
