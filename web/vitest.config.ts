import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)
const reactDomDirectory = dirname(require.resolve('react-dom/package.json'))
const rendererReactDirectory = dirname(
  require.resolve('react/package.json', { paths: [reactDomDirectory] }),
)

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      react: rendererReactDirectory,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/components/checkout/CheckoutPaymentForm.tsx',
        'src/lib/api-error.ts',
        'src/lib/utils.ts',
        'src/store/cart.store.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
