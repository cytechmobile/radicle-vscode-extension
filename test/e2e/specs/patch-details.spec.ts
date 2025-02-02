import type { WebView, Workbench } from 'wdio-vscode-service'
import { $, browser } from '@wdio/globals'
import { $ as zx } from 'zx'
import { Key } from 'webdriverio'
import { openRadicleViewContainer } from '../helpers/actions'

const selectors = {
  openPatchDetailsButton: 'aria/Open Patch Details',
  changePathStatusButton: '[title="Change Patch Status"]',
  draftRadioButton: 'aria/Draft',
  stopEditingPatchStatusButton: '[title="Stop Editing Patch Status"]',
  refreshPatchDataButton: '[title="Refresh Patch Data"]',
  editPatchTitleButton: '[title="Edit Patch Title and Description"]',
  patchTitleInput: 'aria/Patch Title:',
  patchDescriptionInput: 'aria/Patch Description:',
  savePatchTitleButton: '[title="Save Changes to Radicle (Ctrl + Enter)"]',
  openPatchIcon: '.codicon-git-pull-request',
  draftPatchIcon: '.codicon-git-pull-request-draft',
  closedPatchIcon: '.codicon-git-pull-request-closed',
}

/**
 * These tests are failing because the extension is not picking up httpd.
 * An iteration of this suite with adjustments to run locally (with a pre-existing patch) has been
 * tested (on macOS) and works as expected.
 * Barring any unexpected behavior due to the CI environment, these tests *should* pass once the
 * httpd issue is resolved.
 *
 * TODO: Figure out why the extension is not picking up httpd
 */
describe.skip('Patch Details', () => {
  const patchTitle = 'feat: foo bar'
  let workbench: Workbench

  before(async () => {
    workbench = await browser.getWorkbench()
    await zx`git checkout -b branch-1`
    await zx`echo "Hello, World!" > hello.txt`
    await zx`git add .`
    await zx`git commit -m "${patchTitle}"`
    await zx`git push rad HEAD:refs/patches`
    await openRadicleViewContainer(workbench)
    await openPatchDetails(workbench, patchTitle)
  })

  describe("VS Code, when viewing a patch's details,", () => {
    it('allows the user to edit the patch status', async () => {
      const patchDetails = await switchToFirstWebView(workbench)

      await $(selectors.changePathStatusButton).click()
      await $(selectors.draftRadioButton).click()
      await $(selectors.stopEditingPatchStatusButton).click()
      await $(selectors.refreshPatchDataButton).moveTo()

      await expect($(`header ${selectors.draftPatchIcon}`)).toBeDisplayed()

      await patchDetails?.close()

      await expect(
        await (await findPatch(workbench, patchTitle))?.elem.$(selectors.draftPatchIcon),
      ).toBeDisplayed()
    })

    it('allows the user to edit that patch title and description', async () => {
      const patchDetails = await switchToFirstWebView(workbench)
      await $(selectors.editPatchTitleButton).click()

      const newTitle = 'feat: new foo bar'
      const newDescription = 'foo bar baz'
      await findAndFillInput(selectors.patchTitleInput, newTitle)
      await findAndFillInput(selectors.patchDescriptionInput, newDescription)
      await $(selectors.savePatchTitleButton).click()

      await expect($(`p=${newTitle}`)).toBeDisplayed()

      await expect($(`p=${newDescription}`)).toBeDisplayed()

      await patchDetails?.close()

      await expect(await findPatch(workbench, newTitle)).toBeDisplayed()
    })
  })
})

async function findAndFillInput(selector: string, value: string) {
  await $(selector).click()
  await browser.keys([Key.Ctrl, 'a'])
  await browser.keys(value.split(''))
}

async function findPatch(workbench: Workbench, label: string) {
  const sidebarView = workbench.getSideBar().getContent()
  const patchesSection = await sidebarView.getSection('PATCHES')
  const patch = await patchesSection.findItem(label)

  return patch
}

async function openPatchDetails(workbench: Workbench, label: string) {
  const patch = await findPatch(workbench, label)
  if (!patch) {
    return undefined
  }

  await patch.elem.moveTo()
  await patch.elem.$(selectors.openPatchDetailsButton)?.click()

  return patch
}

async function switchToFirstWebView(workbench: Workbench) {
  let webviews: WebView[] = []
  await browser.waitUntil(
    async () => {
      webviews = await workbench.getAllWebviews()

      return webviews.length > 0
    },
    { timeoutMsg: 'no webviews found' },
  )
  await webviews[0]?.open()

  return webviews[0]
}
