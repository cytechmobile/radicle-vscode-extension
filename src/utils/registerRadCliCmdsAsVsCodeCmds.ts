import * as vscode from "vscode";
import { exec, showLog } from ".";

const showOutput = 'Show output';

/**
 * Helper for registering multiple rad cli commands as a vscode command to be
 * available in VS Code's command palette.
 *
 * EXAMPLE:
 * ```ts
 * registerRadCliCmdsAsVsCodeCmds(['push', 'pull'], context)
 * ```
 *
 * @param {string[]} cmds - string[] - a list of a command names
 * @param context - vscode.ExtensionContext
 */
export function registerRadCliCmdsAsVsCodeCmds(
  cmds: readonly string[],
  context: vscode.ExtensionContext,
) {
  cmds.forEach((cmd) =>
    context.subscriptions.push(
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
