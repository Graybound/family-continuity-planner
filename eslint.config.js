import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'release/', 'legacy/', 'node_modules/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // User text must never be parsed as HTML. Build DOM with src/ui/dom.ts instead.
      'no-restricted-properties': ['error',
        { property: 'innerHTML', message: 'Use the h() helper in src/ui/dom.ts. User data must never be parsed as HTML.' },
        { property: 'outerHTML', message: 'Use the h() helper in src/ui/dom.ts.' },
        { property: 'insertAdjacentHTML', message: 'Use the h() helper in src/ui/dom.ts.' },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: 'The app must not make network requests.' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**', 'scripts/**', '*.config.*'],
    rules: { 'no-restricted-properties': 'off', 'no-restricted-globals': 'off' },
  },
);
