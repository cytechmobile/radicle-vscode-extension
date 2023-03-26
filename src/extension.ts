import type { ExtensionContext } from 'vscode';
import { log, registerAllCommands, registerAllConfigWatchers, validateRadCliInstallation } from './utils';
import { version, name } from '../package.json';

export async function activate(ctx: ExtensionContext) {
  log(`Extension "${name}" v${version} activated.`, 'info');

  registerAllCommands(ctx);
  registerAllConfigWatchers(ctx);

  validateRadCliInstallation();
}
