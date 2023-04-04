import { workspace, ConfigurationTarget } from 'vscode';
import type { ExtensionContext } from 'vscode';
import { validateRadCliInstallation } from '.';

/**
 * Gets the value of the user configured path to the Radicle CLI binary, as defined in the
 * extension's settings in VS Code.
 *
 * @returns An empty string if the config isn't set by the user, otherwise the actual
 * value set (after trimming it).
 */
export function getConfigPathToRadBinary(): string {
  const pathToBinary = (
    (workspace
      .getConfiguration()
      .get('radicle.advanced.pathToBinary') as string | undefined) ?? ''
  ).trim();

  return pathToBinary;
}

/**
 * Sets the value of the user configured path to the Radicle CLI binary, defined in the
 * extension's settings in VS Code.
 *
 * @returns A promise that resolves when the setting has been saved.
 */
export async function setConfigPathToRadBinary(newPath: string): Promise<void> {
  return workspace
    .getConfiguration()
    .update('radicle.advanced.pathToBinary', newPath, ConfigurationTarget.Global);
}

function onConfigChange(
  configKey: string,
  ctx: ExtensionContext,
  onChangeCallback: Parameters<typeof workspace.onDidChangeConfiguration>['0'],
): void {
  ctx.subscriptions.push(workspace.onDidChangeConfiguration((ev) => {
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
    onChangeCallback: () => validateRadCliInstallation(),
  },
] satisfies onConfigChangeParam[];

/**
 * Registers all handlers to be called whenever the user changes a specific config
 * in the extension's settings.
 *
 * @param ctx - The extension's context.
 */
export function registerAllConfigWatchers(ctx: ExtensionContext): void {
  configWatchers.forEach((c) => onConfigChange(c.configKey, ctx, c.onChangeCallback));
}
