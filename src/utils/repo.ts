import { doesFileContainText, exec } from '.';

/**
 * Gets the root directory of the git repo of the opened workspace folder.
 *
 * @returns the path to the root directory or `undefined` if not found.
 */
export async function getRepoRootDir(): Promise<string|undefined> {
  const gitRepoRootDir = await exec('git rev-parse --show-toplevel', { shouldLog: false });

  return gitRepoRootDir?.trim();
}

/**
 * Returns `true` if the opened workspace folder is an initialised git repo, otherwise `false`.
 */
export async function isGitInitialised(): Promise<boolean> {
  const isInitialised = Boolean(
    await exec('git rev-parse --is-inside-work-tree', { shouldLog: false })
  );

  return isInitialised;
}

 /**
  * Returns `true` if the opened workspace folder contains a Radicle initialised repo,
  * otherwise `false`.
  */
 export async function isRepoRadInitialised(): Promise<boolean> {
  const isRadInitialised = Boolean(await exec('rad inspect'));

  return isRadInitialised;
}

 /**
  * Returns `true` if the opened workspace folder contains a repo published on Radicle,
  * otherwise `false`.
  */
export async function isRepoRadPublished(): Promise<boolean> {
  const gitRepoRootDir = await getRepoRootDir();

  if (!gitRepoRootDir) {
    return false;
  }

  const isRadPublished = await doesFileContainText(
    `${gitRepoRootDir}/.git/config`,
    'seed =',
  );

  return isRadPublished;
}
