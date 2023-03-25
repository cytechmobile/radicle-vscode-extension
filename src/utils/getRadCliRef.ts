import * as vscode from 'vscode';

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
