import type { ExtensionContext } from 'vscode';
import { radCliCmdsToRegisterInVsCode } from './constants';
import { log, registerRadCliCmdsAsVsCodeCmds } from './utils';
import { version, name } from '../package.json';

export function activate(context: ExtensionContext) {
  registerRadCliCmdsAsVsCodeCmds(radCliCmdsToRegisterInVsCode, context);

  log(`Extension "${name}" v${version} activated.`, 'info');
}
