import type * as VsCode from 'vscode'
import type { Workbench } from 'wdio-vscode-service'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { join } from 'node:path'
import { browser } from '@wdio/globals'
import { httpdHost } from '../constants'
import { openRadicleViewContainer } from '../helpers/actions'
import { expectNotificationToContain } from '../helpers/assertions'
import { getWorkerHttpdPort } from '../helpers/paths'
import {
  assertExtensionResolvedTestSandbox,
  seedPublicRepo,
  startWorkerNodeAndHttpd,
  stopWorkerNodeAndHttpd,
} from '../helpers/testSandbox'

const repoName = 'e2e-clone-target'
const repoDescription = 'A repo seeded for the e2e clone test'

describe('Cloning a Radicle repo', () => {
  let workbench: Workbench
  let workerIndex: number
  let cloneParentDir: string
  let checkoutDir: string
  let workerNodeHome: string
  let expectedRid: string

  before(async () => {
    await assertExtensionResolvedTestSandbox()
    workbench = await browser.getWorkbench()
    workerIndex = Number(process.env['RAD_E2E_WORKER_INDEX'] ?? '0')
    workerNodeHome = process.env['RAD_E2E_NODE_HOME'] ?? ''

    await startWorkerNodeAndHttpd(workerIndex, getWorkerHttpdPort(workerIndex))
    expectedRid = seedPublicRepo(workerIndex, { name: repoName, description: repoDescription })

    cloneParentDir = join(process.env['RAD_E2E_HOME'] ?? '', 'clones')
    checkoutDir = join(cloneParentDir, repoName)
    fs.mkdirSync(cloneParentDir, { recursive: true })

    await openRadicleViewContainer(workbench)
    await setExtensionHttpApiEndpoint(`http://${httpdHost}:${getWorkerHttpdPort(workerIndex)}`)
    await browser.executeWorkbench((_vscode: typeof VsCode, value: string) => {
      process.env['RAD_E2E_CLONE_PARENT_DIR'] = value
    }, cloneParentDir)
  })

  after(() => {
    stopWorkerNodeAndHttpd(workerIndex)
  })

  it('does not clone the repo when the picker is dismissed', async () => {
    await workbench.executeCommand('Clone a Radicle Repository Locally')
    await browser
      .$('.quick-input-widget .monaco-list-row')
      .waitForDisplayed({ timeout: 5_000 })
    await browser.keys('Escape')

    expect(fs.existsSync(checkoutDir)).toBe(false)
  })

  it('lists the repo, runs a real `rad clone`, and writes a valid checkout', async () => {
    await workbench.executeCommand('Clone a Radicle Repository Locally')

    // HACK: because wdio-vscode-service@6.1.4 `selectQuickPick` is bugged
    const repoItem = await browser.$('.quick-input-widget .monaco-list-row')
    const repoItemText = await repoItem.getText()
    const repoItems = await browser.$$('.quick-input-widget .monaco-list-row')

    expect(repoItems.length).toBe(1)
    expect(repoItemText).toContain(repoName)
    expect(repoItemText).toContain(repoDescription)
    expect(repoItemText).toContain(`| ${expectedRid}`)

    await browser.keys(repoName)
    await browser.keys('Enter')

    // The native folder picker is bypassed by the source test seam, so the extension proceeds
    // straight to a real `rad clone` into `<cloneParentDir>/<repoName>`. `rad clone` creates
    // `.git` early but checks out the working tree only once it finishes, so wait for the
    // checked-out README, not `.git`, to know the clone is actually complete.
    await browser.waitUntil(() => fs.existsSync(join(checkoutDir, 'README.md')), {
      timeout: 30_000,
      timeoutMsg: `expected a checked-out README at "${checkoutDir}" after cloning`,
    })

    const radCli = join(workerNodeHome, 'bin', 'rad')
    const clonedRid = execFileSync(radCli, ['inspect', '--rid'], {
      cwd: checkoutDir,
      encoding: 'utf-8',
    }).trim()

    expect(clonedRid).toBe(expectedRid)

    await expectNotificationToContain(workbench, 'Cloned', repoName)
  })

  it('surfaces an error when the Radicle HTTP API is unreachable', async () => {
    stopWorkerNodeAndHttpd(workerIndex)
    await workbench.executeCommand('Clone a Radicle Repository Locally')

    await expectNotificationToContain(workbench, 'Failed', 'Radicle HTTP API')
  })
})

// HACK: Mirrors the settings spec, since wdio-vscode can't drive the Settings UI. Updating the
// endpoint at runtime makes the extension reconnect to this worker's httpd.
async function setExtensionHttpApiEndpoint(endpoint: string) {
  await browser.executeWorkbench(async (vscode: typeof VsCode, value: string) => {
    const config = vscode.workspace.getConfiguration()
    await config.update(
      'radicle.advanced.httpApiEndpoint',
      value,
      vscode.ConfigurationTarget.Global,
    )
  }, endpoint)
}
