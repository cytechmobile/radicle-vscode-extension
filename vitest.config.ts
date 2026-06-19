import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

function toPosix(url: string) {
  return fileURLToPath(new URL(url, import.meta.url)).replaceAll('\\', '/')
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/unit/specs/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    root: toPosix('./'),
  },
  resolve: {
    alias: {
      vscode: toPosix('./test/unit/__mocks__/vscode.ts'),
    },
  },
})
