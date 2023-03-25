import * as vscode from 'vscode';
import { exec, getRadCliRef, showLog } from '.';
import { radCliCmdsToRegisterInVsCode } from '../constants';


type CmdCallback = Parameters<typeof vscode.commands.registerCommand>['1']

function registerSimpleVsCodeCmd(
  name: string,
  action: CmdCallback,
  ctx: vscode.ExtensionContext,
): void {
  ctx.subscriptions.push(vscode.commands.registerCommand(`extension.${name}`, action));
}

function registerRadCliCmdsAsVsCodeCmds(
  cmds: string[] | readonly string[],
  ctx: vscode.ExtensionContext,
): void {
  const btnShowOutput = 'Show output';

  cmds.forEach((radCliCmd) =>
    ctx.subscriptions.push(
      vscode.commands.registerCommand(`extension.${radCliCmd}`, () =>
        exec(`${getRadCliRef()} ${radCliCmd}`, {
          onSuccess: ({ cmd }) =>
            vscode.window
              .showInformationMessage(`Command "${cmd}" succeeded.`, btnShowOutput)
              .then((selection) => selection === btnShowOutput && showLog()),
          onError: ({ cmd }) =>
            vscode.window
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
export function registerAllCommands(ctx: vscode.ExtensionContext): void {
  registerRadCliCmdsAsVsCodeCmds(radCliCmdsToRegisterInVsCode, ctx);
  registerSimpleVsCodeCmd('showExtensionLog', showLog, ctx);
}
