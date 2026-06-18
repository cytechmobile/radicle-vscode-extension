import type { Options } from '@wdio/types'
import {
  chromedriverPath,
  emulatedHomePath,
  rootDir,
  sandboxedPath,
  supportedVscodeVersion,
  testingWorkspacePath,
  wdioCachePath,
  wdioVideoPath,
} from './constants/config'
import { provisionChromeDriver } from './helpers/chromedriver'
import {
  emulateRadCliUninstalled,
  setupTestSandbox,
  teardownTestSandbox,
} from './helpers/testSandbox'

// Done at module scope so every process loading this config (launcher, workers,
// and in turn VS Code + the extension host) inherits the emulated environment.
process.env['HOME'] = emulatedHomePath
process.env['USERPROFILE'] = emulatedHomePath
delete process.env['RAD_HOME']
// Sever any link to the user's real ssh-agent: the extension shells out to `ssh-add`
// (including `ssh-add -D`, which removes keys), which must never reach the real agent.
delete process.env['SSH_AUTH_SOCK']
// Unencrypted throwaway key, usable non-interactively without an ssh-agent.
process.env['RAD_PASSPHRASE'] = ''
process.env['PATH'] = sandboxedPath

let isTearingDown = false
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (isTearingDown) {
      return
    }
    isTearingDown = true
    void teardownTestSandbox().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143))
  })
}

const shouldRecordVideo = Boolean(process.env['CI']) || Boolean(process.env['RECORD_VIDEO'])
const reporters: Options.Testrunner['reporters'] = shouldRecordVideo
  ? ['spec', ['video', { outputDir: wdioVideoPath }]]
  : ['spec']

// TODO: Bump webdriverio to v9 once wdio-vscode-service supports it
// Relevant PR: https://github.com/webdriverio-community/wdio-vscode-service/pull/159
// Relevant Issue: https://github.com/webdriverio-community/wdio-vscode-service/issues/140
export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
    },
  },
  specs: ['./specs/onboarding.spec.ts', './specs/settings.spec.ts'],
  maxInstances: 1,
  capabilities: [
    {
      'browserName': 'vscode',
      'browserVersion': supportedVscodeVersion,
      'wdio:vscodeOptions': {
        extensionPath: rootDir,
        workspacePath: testingWorkspacePath,
        userSettings: {
          'extensions.autoCheckUpdates': false,
          'extensions.autoUpdate': false,
        },
        vscodeArgs: {
          'disable-extensions': true,
          'disable-workspace-trust': true,
        },
      },
      'wdio:chromedriverOptions': {
        binary: chromedriverPath,
      },
    },
  ],
  logLevel: 'warn',
  waitforTimeout: 10000,
  services: [['vscode', { cachePath: wdioCachePath }]],
  framework: 'mocha',
  reporters,
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  onPrepare: async () => {
    try {
      await provisionChromeDriver()
      await setupTestSandbox()
    } catch (error) {
      // wdio does not reliably abort the run when onPrepare rejects, which leaves workers
      // hanging against a missing sandbox. Report and hard-stop instead.
      process.stderr.write(
        `\n[e2e] Test sandbox setup failed; aborting run.\n${String(error)}\n`,
      )
      process.exit(1)
    }
  },
  onComplete: async () => {
    await teardownTestSandbox()
  },
  onWorkerStart: async (_cid, _caps, specs) => {
    if (specs.some((spec) => spec.includes('onboarding.spec.ts'))) {
      await emulateRadCliUninstalled()
    }
  },
}
