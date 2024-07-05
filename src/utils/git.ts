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
 * Resolves the root directory of the git repo of the opened workspace folder.
 */
// TODO: maninak memoize
export function getRepoRoot(): string | undefined {
  const gitRepoRootDir = exec('git rev-parse --show-toplevel', { cwd: '$workspaceDir' })

  return gitRepoRootDir
}

/**
 * Resolves the current branch name if in a Git repository.
 *
 * @example
 * ```ts
 * getCurrentGitBranch() // 'feat/75_fix-pesky-bug'
 * ```
 */
export function getCurrentGitBranch(): string | undefined {
  const currentBranch = exec('git rev-parse --abbrev-ref HEAD', { cwd: '$workspaceDir' })

  return currentBranch
}

/**
 * Resolves the upstream branch of the currently checked out branch if in a Git repository.
 *
 * @example
 * ```ts
 * getCurrentGitUpstreamBranch() // 'origin/main'
 * ```
 */
export function getCurrentGitUpstreamBranch(): string | undefined {
  const currentUpstreamBranch = exec(
    `git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)"`,
    {
      cwd: '$workspaceDir',
    },
  )

  return currentUpstreamBranch
}
