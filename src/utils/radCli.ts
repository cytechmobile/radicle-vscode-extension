import * as vscode from 'vscode';
import { exec, getConfigPathToRadBinary, log } from '.';

/**
 * Resolves a reference to Radicle CLI to be used for executing shell commands.
 *
 * @returns Either the path to the `rad` binary defined manually by the user via
 * config, or otherwise just the string `"rad"`.
 */
export function getRadCliRef(): string {
  const radCliRef = getConfigPathToRadBinary() || 'rad';

  return radCliRef;
}

/**
 * Returns the absolute path to the _resolved_ rad CLI binary.
 *
 * @returns The path to the rad binary, if successfully resolved.
 */
export async function getRadCliPath(): Promise<string | undefined> {
  let radCliPath;

  if (await isRadCliInstalled()){
    radCliPath = (getConfigPathToRadBinary() || await exec('which rad', {
      shouldLog: false,
    }))?.trim();
  }

  return radCliPath;
}

/**
 * Gets the version of the resolved rad CLI binary.
 *
 * @returns The version of the rad cli, if successfully resolved.
 */
export async function getRadCliVersion(): Promise<string | undefined> {
  const version = (await exec(`${getRadCliRef()} --version`, { shouldLog: false }))?.trim();

  return version;
}

/**
 * Answers whether the rad CLI is installed and resolveable on the host OS.
 *
 * @returns `true` if found, otherwise `false`.
 */
export async function isRadCliInstalled(): Promise<boolean> {
  const isInstalled = Boolean(await getRadCliVersion());

  return isInstalled;
}

/**
 * Checks if the CLI is accessible to the extension. If not the user will be informed
 * of the error and offered to troubleshoot.
 *
 * @param options - Optional configuration.
 */
export async function validateRadCliInstallation(options?: {
  notifyUserOnSuccess?: boolean,
}): Promise<void> {
  const opts = options ?? {};

  if (await isRadCliInstalled()) {
   const msg = `Using rad CLI "${await getRadCliVersion()}" from "${await getRadCliPath()}".`;

   log(msg, 'info');
   opts.notifyUserOnSuccess && vscode.window.showInformationMessage(msg);
 } else {
  const msg = `Failed resolving rad CLI binary. Tried invoking it in the shell as "${
    getRadCliRef()
  }".`;
  log(msg, 'error');

  const btnResolve = 'Resolve';
  vscode.window.showWarningMessage(
    "Failed resolving `rad` CLI. Please ensure it is installed on your machine and either that it is globally accessible in the shell or that its path is correctly defined in the extension's configuration. Expect most of the extention's capabilities to remain severely reduced until this issue is resolved.",
    btnResolve,
  )
  .then((selection) => selection === btnResolve && console.log('TODO: read user input to rad binary path, while also hinting to the getting started guide'));
 }
}
