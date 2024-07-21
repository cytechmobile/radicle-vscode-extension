import { type TextDocumentShowOptions, Uri, commands, window } from 'vscode'
import { useEnvStore, usePatchStore } from '../stores'
import { assert, assertUnreachable, log, showLog } from '../utils'
import {
  type FilechangeNode,
  checkOutDefaultBranch,
  checkOutPatch,
  copyToClipboardAndNotify,
  deAuthCurrentRadicleIdentity,
  launchAuthenticationFlow,
  mutatePatch,
  selectAndCloneRadicleRepo,
  troubleshootRadCliInstallation,
} from '../ux'
import type { AugmentedPatch, Patch, PatchStatus } from '../types'
import { createOrReuseWebviewPanel, execPatchMutation, execRad } from '.'

interface RadCliCmdMappedToVscodeCmdId {
  /**
   * The ID used within the app's source code to reference the VS Code command.
   *
   * PRE-CONDITIONS:
   * - Must match an entry defined in package.json's `contributes.commands`
   *
   * @example 'radicle.fetch'
   */
  vscodeCmdId: `radicle.${string}`
  /**
   * The actual params for rad command.
   *
   * @example ['sync, '--fetch'] // `rad sync --fetch`
   */
  radCliCmdParams: string[]
}

const simpleRadCliCmdsToRegisterInVsCode: Parameters<
  typeof registerSimpleRadCliCmdsAsVsCodeCmds
>['0'] = [
  { vscodeCmdId: 'radicle.sync', radCliCmdParams: ['sync'] },
  { vscodeCmdId: 'radicle.fetch', radCliCmdParams: ['sync', '--fetch'] },
  { vscodeCmdId: 'radicle.announce', radCliCmdParams: ['sync', '--announce'] },
] as const

function registerVsCodeCmd(
  vscodeCmdId: RadCliCmdMappedToVscodeCmdId['vscodeCmdId'],
  action: Parameters<typeof commands.registerCommand>['1'],
): void {
  useEnvStore().extCtx.subscriptions.push(commands.registerCommand(vscodeCmdId, action))
}

function registerSimpleRadCliCmdsAsVsCodeCmds(
  cmdConfigs: readonly RadCliCmdMappedToVscodeCmdId[],
): void {
  const button = 'Show Output'

  cmdConfigs.forEach((cmdConfig) =>
    useEnvStore().extCtx.subscriptions.push(
      commands.registerCommand(cmdConfig.vscodeCmdId, async () => {
        const isAuthed = await launchAuthenticationFlow()
        const didCmdSucceed =
          isAuthed &&
          (await window.withProgress(
            { location: { viewId: 'cli-commands' } },
            // eslint-disable-next-line require-await, @typescript-eslint/require-await
            async () => {
              const { errorCode } = execRad(cmdConfig.radCliCmdParams, {
                cwd: '$workspaceDir',
                shouldLog: true,
              })

              return !errorCode
            },
          ))

        didCmdSucceed
          ? window.showInformationMessage(
              `Command "rad ${cmdConfig.radCliCmdParams.join(' ')}" succeeded`,
            )
          : window
              .showErrorMessage(
                `Command "rad ${cmdConfig.radCliCmdParams.join(' ')}" failed`,
                button,
              )
              .then((userSelection) => {
                userSelection === button && showLog()
              })
      }),
    ),
  )
}

/**
 * Registers in VS Code all the commands this extension advertises in its manifest.
 */
export function registerAllCommands(): void {
  registerSimpleRadCliCmdsAsVsCodeCmds(simpleRadCliCmdsToRegisterInVsCode)

  registerVsCodeCmd('radicle.troubleshootRadCliInstallation', troubleshootRadCliInstallation)
  registerVsCodeCmd('radicle.showExtensionLog', showLog)
  registerVsCodeCmd('radicle.deAuthCurrentIdentity', deAuthCurrentRadicleIdentity)
  registerVsCodeCmd('radicle.clone', selectAndCloneRadicleRepo)
  registerVsCodeCmd('radicle.collapsePatches', () => {
    commands.executeCommand('workbench.actions.treeView.patches-view.collapseAll')
  })
  registerVsCodeCmd('radicle.refreshAllPatches', () => {
    usePatchStore().resetAllPatches()
  })
  registerVsCodeCmd('radicle.refreshOnePatch', (patch: Patch | undefined) => {
    assert(patch)
    usePatchStore().refetchPatch(patch?.id)
  })
  registerVsCodeCmd('radicle.checkoutPatch', checkOutPatch)
  registerVsCodeCmd('radicle.checkoutDefaultBranch', checkOutDefaultBranch)
  registerVsCodeCmd('radicle.copyPatchId', async (patch: Patch | undefined) => {
    assert(patch)
    await copyToClipboardAndNotify(patch.id)
  })
  registerVsCodeCmd(
    'radicle.openDiff',
    async (
      original: Uri,
      changed: Uri,
      label: string,
      columnOrOptions: number | TextDocumentShowOptions,
    ) => {
      await commands.executeCommand('vscode.diff', original, changed, label, columnOrOptions)
      commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession')
    },
  )
  registerVsCodeCmd(
    'radicle.openOriginalVersionOfPatchedFile',
    async (node: FilechangeNode | undefined) => {
      if (node?.oldVersionUrl) {
        await commands.executeCommand('vscode.open', Uri.file(node.oldVersionUrl))
        commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession')
      } else {
        log(
          'Failed opening editor with old version of patched file.',
          'error',
          `Error: Command "radicle.openOriginalVersionOfPatchedFile" was called with wrong "node" param value.`,
        )
      }
    },
  )
  registerVsCodeCmd(
    'radicle.openChangedVersionOfPatchedFile',
    async (node: FilechangeNode | undefined) => {
      if (node?.newVersionUrl) {
        await commands.executeCommand('vscode.open', Uri.file(node.newVersionUrl))
        commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession')
      } else {
        log(
          'Failed opening editor with changed version of patched file.',
          'error',
          `Error: Command "radicle.openChangedVersionOfPatchedFile" was called with wrong "node" param value.`,
        )
      }
    },
  )
  registerVsCodeCmd('radicle.viewPatchDetails', (patch: AugmentedPatch) => {
    assert(patch)
    createOrReuseWebviewPanel({
      webviewId: 'webview-patch-detail',
      data: patch.id,
      proposedPanelTitle: patch.title,
    })
  })
  registerVsCodeCmd('radicle.draftizePatch', (patch: Patch | undefined) => {
    assert(patch)
    const patchStatus = patch.state.status as Exclude<PatchStatus, 'draft' | 'merged'>

    switch (patchStatus) {
      case 'open':
        mutatePatch(patch.id, patch.title, (timeout?: number) => {
          return execPatchMutation(['ready', patch.id, '--undo'], timeout)
        })
        break
      case 'archived':
        commands.executeCommand('radicle.openPatch', patch)
        commands.executeCommand('radicle.draftizePatch', {
          ...patch,
          state: { status: 'open' },
        })
        break
      default:
        assertUnreachable(patchStatus)
    }
  })
  registerVsCodeCmd('radicle.openPatch', (patch: Patch | undefined) => {
    assert(patch)
    const patchStatus = patch.state.status as Exclude<PatchStatus, 'open' | 'merged'>

    switch (patchStatus) {
      case 'draft':
        mutatePatch(patch.id, patch.title, (timeout?: number) => {
          return execPatchMutation(['ready', patch.id], timeout)
        })
        break
      case 'archived':
        mutatePatch(patch.id, patch.title, (timeout?: number) => {
          return execPatchMutation(['archive', patch.id, '--undo'], timeout)
        })
        break
      default:
        assertUnreachable(patchStatus)
    }
  })
  registerVsCodeCmd('radicle.archivePatch', (patch: Patch | undefined) => {
    assert(patch)
    mutatePatch(patch.id, patch.title, (timeout?: number) => {
      return execPatchMutation(['archive', patch.id], timeout)
    })
  })
}
