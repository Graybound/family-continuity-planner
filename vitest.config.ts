import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test'), __REPO_URL__: JSON.stringify('https://github.com/example/example') },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
