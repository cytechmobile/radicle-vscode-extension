import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: (tag) => tag.includes('vscode-') } },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'extensionHelpers': fileURLToPath(new URL('../helpers', import.meta.url)),
      'extensionUtils': fileURLToPath(new URL('../utils', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      external: ['vscode'],
      // produce predictable filenames without cache-busting SHA suffix
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  base: '',
})
