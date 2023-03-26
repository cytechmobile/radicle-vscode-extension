import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';
import { validateRadCliInstallation } from './radCli';

/**
 * Gets the path to the rad CLI binary, as configured by the user in the extension's
 * settings in VS Code.
 *
 * @returns An empty string if the config isn't set by the user, otherwise the actual
 * value set (after trimming it).
 */
export function getConfigPathToRadBinary(): string {
  const pathToBinary = (
    (vscode.workspace
      .getConfiguration()
      .get('radicle.advanced.pathToBinary') as string | undefined) ?? ''
  ).trim();

  return pathToBinary;
}

function onConfigChange(
  configKey: string,
  ctx: ExtensionContext,
  onChangeCallback: Parameters<typeof vscode.workspace.onDidChangeConfiguration>['0'],
): void {
  ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration((ev) => {
    if (ev.affectsConfiguration(configKey)) {
      onChangeCallback(ev);
    }
  }));
}

interface onConfigChangeParam  {
  configKey: Parameters<typeof onConfigChange>['0']
  onChangeCallback: Parameters<typeof onConfigChange>['2']
}

const configWatchers = [
  {
    configKey: 'radicle.advanced.pathToBinary',
    onChangeCallback: () => validateRadCliInstallation({ notifyUserOnSuccess: true })
  },
] satisfies onConfigChangeParam[];

/**
 * Registers all handlers to be called whenever the user changes a specific setting
 * in the extension's settings.
 *
 * @param ctx - The extension's context.
 */
export function registerAllConfigWatchers(ctx: ExtensionContext): void {
  configWatchers.forEach((c) => onConfigChange(c.configKey, ctx, c.onChangeCallback));
}
