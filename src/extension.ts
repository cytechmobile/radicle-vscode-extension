import type { ExtensionContext } from 'vscode';
import { radCliCmdsToRegisterInVsCode } from './constants';
import { registerRadCliCmdsAsVsCodeCmds } from './utils';

export function activate(context: ExtensionContext) {
  registerRadCliCmdsAsVsCodeCmds(radCliCmdsToRegisterInVsCode, context);

  console.info('radicle-vscode-extension is activated');
}
