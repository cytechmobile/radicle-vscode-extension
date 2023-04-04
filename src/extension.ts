import type { ExtensionContext } from 'vscode';
import { log, registerAllCommands, registerAllConfigWatchers, registerAllFileWatchers, validateRadCliInstallation } from './utils';
import { version, name } from '../package.json';

export async function activate(ctx: ExtensionContext) {
   // TODO: maninak extract to logExtensionActivated()
   // TODO: maninak use ctx.extension.packageJSON instead
  log(`Extension "${name}" v${version} activated.`, 'info');

  registerAllCommands(ctx);
  registerAllConfigWatchers(ctx);
  registerAllFileWatchers();

  validateRadCliInstallation({ minimizeUserNotifications: true });
}
