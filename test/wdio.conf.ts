import path from 'node:path'
import { e2eTestDirPath } from './constants/config'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const packageJson = require('../package.json')

if (!process.env['CI']) {
  throw new Error('E2E tests should only be run in CI')
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const vscodeVersion = (packageJson.engines.vscode as string).replace(/^\^/, '')

export const config: WebdriverIO.Config = {
  runner: 'local',
  tsConfigPath: './tsconfig.json',
  specs: ['./specs/**/*.ts'],
  maxInstances: 10,
  capabilities: [
    {
      'browserName': 'vscode',
      'browserVersion': vscodeVersion,
      'wdio:vscodeOptions': {
        extensionPath: path.join(e2eTestDirPath, '..'),
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
      // Driver introduced in v9 has a bug that prevents tests from running
      'wdio:enforceWebDriverClassic': true,
    },
  ],

  logLevel: 'warn',
  waitforTimeout: 10000,
  services: [['vscode', { cachePath: path.join(__dirname, '.cache') }]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
}
