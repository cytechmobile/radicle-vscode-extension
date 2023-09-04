import { exec } from '.'

/**
 * Returns `true` if the opened workspace folder is an initialized git repo, otherwise `false`.
 */
export function isGitRepo(): boolean {
  const isInitialized = Boolean(
    exec('git rev-parse --is-inside-work-tree', { cwd: '$workspaceDir' }),
  )

  return isInitialized
}

/**
 * Gets the root directory of the git repo of the opened workspace folder.
 *
 * @returns the path to the root directory or `undefined` if not found.
 */
export function getRepoRoot(): string | undefined {
  const gitRepoRootDir = exec('git rev-parse --show-toplevel', { cwd: '$workspaceDir' })

  return gitRepoRootDir
}
