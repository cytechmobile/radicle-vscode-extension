import { doesFileContainText, exec, getRepoRoot } from '../utils'

/**
 * Returns `true` if the opened workspace folder contains a Radicle initialised repo,
 * otherwise `false`.
 */
export function isRepoRadInitialised(): boolean {
  const isRadInitialised = Boolean(exec('rad inspect'))

  return isRadInitialised
}

/**
 * Returns `true` if the opened workspace folder contains a repo published on Radicle,
 * otherwise `false`.
 */
export async function isRepoRadPublished(): Promise<boolean> {
  const gitRepoRootDir = getRepoRoot()

  if (!gitRepoRootDir) {
    return false
  }

  const isRadPublished = await doesFileContainText(`${gitRepoRootDir}/.git/config`, '[rad]')

  return isRadPublished
}
