import * as vscode from 'vscode'
import { type GitExtension, type GitExtensionAPI, Status } from '../types'
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
 * getCurrentGitBranch() // 'feat/75_checkout-patch'
 * ```
 */
export function getCurrentGitBranch(): string | undefined {
  const currentBranch = exec('git rev-parse --abbrev-ref HEAD', { cwd: '$workspaceDir' })

  return currentBranch
}

export function getGitExtensionAPI(): GitExtensionAPI {
  const gitExtensionId = 'vscode.git'
  const gitExtension = vscode.extensions.getExtension<GitExtension>(gitExtensionId)

  if (gitExtension === undefined) {
    throw new Error(`Could not load VSCode Git extension with id '${gitExtensionId}'`)
  }

  return gitExtension.exports.getAPI(1)
}

export function gitExtensionStatusToInternalFileChangeState(
  status: Status,
): 'added' | 'copied' | 'deleted' | 'modified' | 'moved' {
  switch (status) {
    case Status.INDEX_RENAMED:
      return 'moved'
    case Status.INDEX_COPIED:
      return 'copied'
    case Status.INDEX_MODIFIED:
    case Status.MODIFIED:
      return 'modified'
    case Status.INDEX_DELETED:
    case Status.DELETED:
      return 'deleted'
    case Status.INDEX_ADDED:
      return 'added'
    default:
      throw new Error(`Encountered unexpected Git extension Status '${status}'`)
  }
}
