import { commands, window } from 'vscode'
import { getExtensionContext } from '../store'
import { radCliCmdsToRegisterInVsCode } from '../constants'
import { authenticate, exec, getRadCliRef, showLog } from '.'

type CmdCallback = Parameters<typeof commands.registerCommand>['1']

function registerSimpleVsCodeCmd(name: string, action: CmdCallback): void {
  getExtensionContext().subscriptions.push(
    commands.registerCommand(`extension.${name}`, action),
  )
}

function registerRadCliCmdsAsVsCodeCmds(cmds: string[] | readonly string[]): void {
  const button = 'Show output'

  cmds.forEach((radCliCmd) =>
    getExtensionContext().subscriptions.push(
      commands.registerCommand(`extension.${radCliCmd}`, async () => {
        const didAuth = await authenticate()
        const didCmdSucceed =
          didAuth &&
          Boolean(await exec(`${await getRadCliRef()} ${radCliCmd}`, { shouldLog: true }))

        didCmdSucceed
          ? window.showInformationMessage(`Command "rad ${radCliCmd}" succeeded`)
          : window
              .showErrorMessage(`Command "rad ${radCliCmd}" failed`, button)
              .then((userSelection) => userSelection === button && showLog())
      }),
    ),
  )
}

/**
 * Registers in VS Code all the commands this extension advertises in its manifest.
 */
export function registerAllCommands(): void {
  registerRadCliCmdsAsVsCodeCmds(radCliCmdsToRegisterInVsCode)
  registerSimpleVsCodeCmd('showExtensionLog', showLog)
}
