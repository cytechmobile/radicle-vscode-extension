import type { ExtensionContext } from 'vscode';
import { getRadCliPath, getRadCliVersion, isRadCliInstalled, log, registerAllCommands } from './utils';
import { version, name } from '../package.json';

export async function activate(ctx: ExtensionContext) {
  registerAllCommands(ctx);

  log(`Extension "${name}" v${version} activated.`, 'info');

  await isRadCliInstalled()
    ? log(`Using CLI "${await getRadCliVersion()}" from "${await getRadCliPath()}".`, 'info')
    : console.log('rad not installed'); // handleRadCliNotFound();
}
