import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Always run tests with mocked AI — never hit the real Anthropic API
    env: { USE_REAL_AI: 'false' },
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
})
