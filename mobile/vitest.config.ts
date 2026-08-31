import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)
const mobileReactDirectory = dirname(require.resolve('react/package.json'))

export default defineConfig({
  resolve: {
    alias: {
      react: mobileReactDirectory,
    },
  },
  test: {
    clearMocks: true,
    restoreMocks: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
})
