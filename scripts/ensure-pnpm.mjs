#!/usr/bin/env node

// Enforces pnpm for contributors of this repo so the lockfile stays in sync.
// No-op when this package is installed as a dependency.

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const isDevInstall = existsSync(join(repoRoot, '.git'))

if (!isDevInstall) {
  process.exit(0)
}

if (!process.env.npm_config_user_agent?.startsWith('pnpm')) {
  process.stderr.write('\nError: This repo uses `pnpm` for package management.\n\n')
  process.exit(1)
}
