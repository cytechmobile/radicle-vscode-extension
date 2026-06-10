import type { Options } from '@wdio/types'
import path from 'node:path'
import { $ } from 'zx'

import {
  backupNodeHomePath,
  e2eTestDirPath,
  nodeHomePath,
  rootDirPath,
} from './constants/config'

// eslint-disable-next-line ts/no-require-imports, ts/no-unsafe-assignment, perfectionist/sort-imports
const packageJson = require('../../package.json')

if (!process.env['CI']) {
  throw new Error('E2E tests should only be run in CI')
}

// eslint-disable-next-line ts/no-unsafe-member-access
const vscodeVersion = (packageJson.engines.vscode as string).replace(/^\^/, '')

// TODO: Bump webdriverio to v9 once wdio-vscode-service supports it
// Relevant PR: https://github.com/webdriverio-community/wdio-vscode-service/pull/130
// Relevant Issue: https://github.com/webdriverio-community/wdio-vscode-service/issues/140
export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
    },
  },
  specs: ['./specs/**/*.ts'],
  maxInstances: 10,
  capabilities: [
    {
      'browserName': 'vscode',
      'browserVersion': vscodeVersion,
      'wdio:vscodeOptions': {
        extensionPath: rootDirPath,
        workspacePath: path.join(e2eTestDirPath, 'fixtures/workspaces/basic'),
        userSettings: {
          'extensions.autoCheckUpdates': false,
          'extensions.autoUpdate': false,
        },
        vscodeArgs: {
          'disable-extensions': true,
          'disable-workspace-trust': true,
        },
      },
    },
  ],
  logLevel: 'warn',
  waitforTimeout: 10000,
  services: [['vscode', { cachePath: path.join(rootDirPath, 'node_modules/.cache/wdio') }]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  onPrepare: async () => {
    await $`mkdir -p ${path.join(rootDirPath, 'node_modules/.cache/wdio')}`
  },
  onWorkerStart: async (_cid, _caps, specs) => {
    if (specs.some((spec) => spec.includes('onboarding.spec.ts'))) {
      await $`mv ${nodeHomePath} ${backupNodeHomePath}`
    }
  },
}
