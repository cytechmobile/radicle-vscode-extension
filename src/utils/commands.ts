import * as vscode from "vscode";
import { exec, showLog } from ".";
import { radCliCmdsToRegisterInVsCode } from '../constants';


type CmdCallback = Parameters<typeof vscode.commands.registerCommand>['1']

function registerSimpleVsCodeCmd(
  name: string,
  action: CmdCallback,
  ctx: vscode.ExtensionContext,
): void {
  ctx.subscriptions.push(vscode.commands.registerCommand(`extension.${name}`, action));
}

const showOutput = 'Show output';

function registerRadCliCmdsAsVsCodeCmds(
  cmds: readonly string[],
  ctx: vscode.ExtensionContext,
): void {
  cmds.forEach((cmd) =>
    ctx.subscriptions.push(
      vscode.commands.registerCommand(`extension.${cmd}`, () =>
        exec(`rad ${cmd}`, {
          onSuccess: ({ cmd }) =>
            vscode.window
              .showInformationMessage(`Command "${cmd}" succeeded.`, showOutput)
              .then((selection) => selection === showOutput && showLog()),
          onError: ({ cmd }) =>
            vscode.window
              .showErrorMessage(`Command "${cmd}" failed.`, showOutput)
              .then((selection) => selection === showOutput && showLog()),
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
