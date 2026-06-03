#!/usr/bin/env node

// Run as the `preinstall` lifecycle hook, which fires before every package install
// (pnpm/npm/yarn/bun install) but NOT before `npm run`, so this guard never interferes
// with using npm purely as a script runner.

if (process.env['npm_config_user_agent']?.startsWith('pnpm') === false) {
  process.stderr.write('\nError: This repo uses `pnpm` for package management.\n\n')
  process.exit(1)
}
