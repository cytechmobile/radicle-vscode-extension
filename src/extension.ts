import type { ExtensionContext } from 'vscode';
import { logExtensionActivated, registerAllCommands, registerAllConfigWatchers, registerAllFileWatchers, validateRadCliInstallation } from './utils';

export async function activate(ctx: ExtensionContext) {
  registerAllCommands(ctx);
  registerAllConfigWatchers(ctx);
  registerAllFileWatchers();

  logExtensionActivated(ctx);
  validateRadCliInstallation({ minimizeUserNotifications: true });
}
