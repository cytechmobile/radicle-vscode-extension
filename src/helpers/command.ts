import { commands, window } from 'vscode'
import { getExtensionContext } from '../store'
import { exec, showLog } from '../utils'
import {
  authenticate,
  deAuthCurrentRadicleIdentity,
  selectAndCloneRadicleProject,
} from '../ux'
import { getRadCliRef } from '.'

/**
 * PRE-CONDITION:
 *
 * Each command has a matching entry defined in package.json's `contributes.commands`.
 */
const simpleRadCliCmdsToRegisterInVsCode = ['push', 'pull', 'sync'] as const
type CmdCallback = Parameters<typeof commands.registerCommand>['1']

function registerSimpleVsCodeCmd(name: string, action: CmdCallback): void {
  getExtensionContext().subscriptions.push(commands.registerCommand(`radicle.${name}`, action))
}

function registerSimpleRadCliCmdsAsVsCodeCmds(cmds: string[] | readonly string[]): void {
  const button = 'Show output'

  cmds.forEach((radCliCmd) =>
    getExtensionContext().subscriptions.push(
      commands.registerCommand(`radicle.${radCliCmd}`, async () => {
        const didAuth = await authenticate()
        const didCmdSucceed =
          didAuth && Boolean(exec(`${getRadCliRef()} ${radCliCmd}`, { shouldLog: true }))

        didCmdSucceed
          ? window.showInformationMessage(`Command "rad ${radCliCmd}" succeeded`)
          : window
              .showErrorMessage(`Command "rad ${radCliCmd}" failed`, button)
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

  registerSimpleVsCodeCmd('showExtensionLog', showLog)
  registerSimpleVsCodeCmd('deAuthCurrentIdentity', deAuthCurrentRadicleIdentity)
  registerSimpleVsCodeCmd('clone', selectAndCloneRadicleProject)
}
