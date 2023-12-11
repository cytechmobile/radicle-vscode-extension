/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

const { build } = require('esbuild')

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
}

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  ...baseConfig,
  platform: 'node',
  target: 'es2020',
  mainFields: ['module', 'main'],
  format: 'cjs',
  entryPoints: ['./src/extension.ts'],
  outfile: './dist/extension.js',
  external: ['vscode'],
}

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  ...baseConfig,
  target: 'es2020',
  format: 'esm',
  entryPoints: ['./src/webview/main.ts'],
  outfile: './dist/webview.js',
}

;(async () => {
  try {
    await build(extensionConfig)
    await build(webviewConfig)
    console.log('build complete')
  } catch (err) {
    process.stderr.write(err.stderr)
    process.exit(1)
  }
})()
