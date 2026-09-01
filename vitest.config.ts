import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts']
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer/src'),
      '@main': path.resolve(__dirname, 'src/main')
    }
  }
})
