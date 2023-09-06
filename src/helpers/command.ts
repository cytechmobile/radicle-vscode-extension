import { commands, window } from 'vscode'
import { getExtensionContext } from '../store'
import { exec, showLog } from '../utils'
import {
  copyToClipboardAndNotifify,
  deAuthCurrentRadicleIdentity,
  launchAuthenticationFlow,
  patchesRefreshEventEmitter,
  selectAndCloneRadicleProject,
} from '../ux'
import { type Patch, getRadCliRef } from '.'

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
   * The actual sub-command to be run by the Radicle CLI. Value will be appended to a
   * reference to the rad binary before executing it in the shell:
   *
   * @example 'sync --fetch' // `rad sync --fetch`
   */
  radCliCmdSuffix: string
}

const simpleRadCliCmdsToRegisterInVsCode: Parameters<
  typeof registerSimpleRadCliCmdsAsVsCodeCmds
>['0'] = [
  { vscodeCmdId: 'radicle.sync', radCliCmdSuffix: 'sync' },
  { vscodeCmdId: 'radicle.fetch', radCliCmdSuffix: 'sync --fetch' },
  { vscodeCmdId: 'radicle.announce', radCliCmdSuffix: 'sync --announce' },
] as const

function registerVsCodeCmd(
  vscodeCmdId: RadCliCmdMappedToVscodeCmdId['vscodeCmdId'],
  action: Parameters<typeof commands.registerCommand>['1'],
): void {
  getExtensionContext().subscriptions.push(commands.registerCommand(vscodeCmdId, action))
}

function registerSimpleRadCliCmdsAsVsCodeCmds(
  cmdConfigs: readonly RadCliCmdMappedToVscodeCmdId[],
): void {
  const button = 'Show Output'

  cmdConfigs.forEach((cmdConfig) =>
    getExtensionContext().subscriptions.push(
      commands.registerCommand(cmdConfig.vscodeCmdId, async () => {
        const didAuth = await launchAuthenticationFlow()
        const didCmdSucceed =
          didAuth &&
          Boolean(
            exec(`${getRadCliRef()} ${cmdConfig.radCliCmdSuffix}`, {
              cwd: '$workspaceDir',
              shouldLog: true,
            }),
          )

        didCmdSucceed
          ? window.showInformationMessage(
              `Command "rad ${cmdConfig.radCliCmdSuffix}" succeeded`,
            )
          : window
              .showErrorMessage(`Command "rad ${cmdConfig.radCliCmdSuffix}" failed`, button)
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

  registerVsCodeCmd('radicle.showExtensionLog', showLog)
  registerVsCodeCmd('radicle.deAuthCurrentIdentity', deAuthCurrentRadicleIdentity)
  registerVsCodeCmd('radicle.clone', selectAndCloneRadicleProject)
  registerVsCodeCmd('radicle.refreshPatches', () => {
    patchesRefreshEventEmitter.fire(undefined)
  })
  registerVsCodeCmd('radicle.copyPatchId', async (patch: Partial<Patch> | undefined) => {
    typeof patch?.id === 'string' && (await copyToClipboardAndNotifify(patch.id))
  })
}
