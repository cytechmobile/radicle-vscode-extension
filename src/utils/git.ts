import { exec } from '.'

/**
 * Returns `true` if the opened workspace folder is an initialised git repo, otherwise `false`.
 */
export function isGitRepo(): boolean {
  const isInitialised = Boolean(exec('git rev-parse --is-inside-work-tree'))

  return isInitialised
}

/**
 * Gets the root directory of the git repo of the opened workspace folder.
 *
 * @returns the path to the root directory or `undefined` if not found.
 */
export function getRepoRoot(): string | undefined {
  const gitRepoRootDir = exec('git rev-parse --show-toplevel')

  return gitRepoRootDir
}
