import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'lib': fileURLToPath(new URL('../../lib', import.meta.url)),
      'utils': fileURLToPath(new URL('../utils', import.meta.url)),
    }
  },
  build:{
    rollupOptions: {
      external: ['vscode'],
      // produce predictable filenames without cache-busting SHA suffix
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
  },}
})
