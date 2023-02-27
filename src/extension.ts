import type { ExtensionContext } from 'vscode';
import { log, registerAllCommands } from './utils';
import { version, name } from '../package.json';

export function activate(ctx: ExtensionContext) {
  registerAllCommands(ctx);

  log(`Extension "${name}" v${version} activated.`, 'info');
}
