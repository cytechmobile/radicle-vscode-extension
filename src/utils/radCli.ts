import * as vscode from 'vscode';
import { exec } from '.';

function getConfigPathToRadBinary(): string {
  const pathToBinary = (
    (vscode.workspace
      .getConfiguration()
      .get('radicle.advanced.pathToBinary') as string | undefined) ?? ''
  ).trim();

  return pathToBinary;
}

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
 * Resolves the absolute path to the resolved rad CLI binary.
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
