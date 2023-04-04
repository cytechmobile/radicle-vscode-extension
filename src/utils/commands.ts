import { commands, window } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { exec, getRadCliRef, showLog } from '.';
import { radCliCmdsToRegisterInVsCode } from '../constants';


type CmdCallback = Parameters<typeof commands.registerCommand>['1']

function registerSimpleVsCodeCmd(
  name: string,
  action: CmdCallback,
  ctx: ExtensionContext,
): void {
  ctx.subscriptions.push(commands.registerCommand(`extension.${name}`, action));
}

function registerRadCliCmdsAsVsCodeCmds(
  cmds: string[] | readonly string[],
  ctx: ExtensionContext,
): void {
  const btnShowOutput = 'Show output';

  cmds.forEach((radCliCmd) =>
    ctx.subscriptions.push(
      commands.registerCommand(`extension.${radCliCmd}`, () =>
        exec(`${getRadCliRef()} ${radCliCmd}`, {
          onSuccess: ({ cmd }) =>
            window
              .showInformationMessage(`Command "${cmd}" succeeded.`, btnShowOutput)
              .then((selection) => selection === btnShowOutput && showLog()),
          onError: ({ cmd }) =>
            window
              .showErrorMessage(`Command "${cmd}" failed.`, btnShowOutput)
              .then((selection) => selection === btnShowOutput && showLog()),
        })
      )
    )
  );
}

/**
 * Registers in VS Code all the commands this extension advertises in its manifest.
 *
 * @param ctx The extension's context.
 */
export function registerAllCommands(ctx: ExtensionContext): void {
  registerRadCliCmdsAsVsCodeCmds(radCliCmdsToRegisterInVsCode, ctx);
  registerSimpleVsCodeCmd('showExtensionLog', showLog, ctx);
}
