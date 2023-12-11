/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

const { build } = require('esbuild')

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

;(async () => {
  try {
    await build(extensionConfig)
    console.log('build complete')
  } catch (err) {
    process.stderr.write(err.stderr)
    process.exit(1)
  }
})()
