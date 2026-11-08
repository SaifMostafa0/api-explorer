/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom plus Node's AbortSignal; see the file for why.
    environment: './src/test/jsdom-environment.ts',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Gates from the spec apply to the critical logic modules, not to UI glue.
      include: ['src/domain/**', 'src/http/**', 'src/infrastructure/**'],
      thresholds: { statements: 80, branches: 75 },
    },
  },
})
