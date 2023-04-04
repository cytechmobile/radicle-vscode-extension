import { RelativePattern, Uri, workspace, } from 'vscode';
import { readFile } from 'fs/promises';
import { getRepoRootDir, isGitInitialised, isRadCliInstalled, isRepoRadInitialised, isRepoRadPublished, setWhenClauseContext, warnUserRadCliNotResolvedAndMaybeTroubleshoot } from '.';

/**
 * Returns an array with the paths of each open folder in the workspace or `undefined`
 * if no workspace has been opened.
 */
export function getWorkspaceFolderPaths(): string[] | undefined {
  const dirs = workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);

  return dirs;
}

/**
 * Checks if a file contains a specific text.
 *
 * @param filePath The path to the file of which the contents are to be checked
 * @param text The text to search for.
 * @returns `true` if text is found in the file, otherwise `false`.
 */
export async function doesFileContainText(filePath: string, text: string): Promise<boolean> {
  const contents = await readFile(filePath, 'utf-8');
  const isTextInFile = contents.includes(text);

  return isTextInFile;
}

// A very hacky and specialized wrapper. If it doesn't meet your use case, consider
// going manual instead of adapting it.
async function watchFileNotInWorkspace(
  glob: Parameters<typeof workspace.createFileSystemWatcher>['0']
    | (() => Promise<Parameters<typeof workspace.createFileSystemWatcher>['0']>),
  handler: () => unknown,
): Promise<void> {
  handler(); // always run once on init

  const resolvedGlobPattern = typeof glob === 'function' ? await glob() : glob;

  const watcher = workspace.createFileSystemWatcher(resolvedGlobPattern);
  watcher.onDidCreate(handler);
  watcher.onDidChange(handler);
  watcher.onDidDelete(handler);
}

interface watchFileNotInWorkspaceParam  {
  glob: Parameters<typeof watchFileNotInWorkspace>['0']
  handler: Parameters<typeof watchFileNotInWorkspace>['1']
}

const notInWorkspaceFileWatchers = [
  {
    glob: async () => new RelativePattern(
      // `getRepoRootDir()` will return undefined if user opens the extension on
      // a non-git-initialized folder, pointing our watcher to the wrong path.
      // We're doing a best effort using the first workspace folder instead.
      Uri.file(`${await getRepoRootDir() ?? getWorkspaceFolderPaths()?.[0] ?? ''}/.git/`),
      'config',
    ),
    handler: async () => {
      setWhenClauseContext('radicle.isRepoRadInitialised', await isRepoRadInitialised());
      setWhenClauseContext('radicle.isRepoRadPublished', await isRepoRadPublished());

      if (
        !(await isRadCliInstalled()) &&
        !(await isRepoRadPublished()) &&
        (await isGitInitialised())
      ) {
        warnUserRadCliNotResolvedAndMaybeTroubleshoot();
      }
    },
  },
  (() => {
    switch (process.platform) {
      case 'linux': return {
        glob: new RelativePattern(Uri.file('/usr/bin/'), 'rad'),
        handler: async () => setWhenClauseContext(
          'radicle.isRadCliInstalled',
          await isRadCliInstalled(),
        ),
      };
      case 'darwin': return {
        glob: new RelativePattern(Uri.file('~/.cargo/bin/'), 'rad'),
        handler: async () => setWhenClauseContext(
          'radicle.isRadCliInstalled',
          await isRadCliInstalled(),
        ),
      };
    }
  })(),
] satisfies (watchFileNotInWorkspaceParam|undefined)[];

/**
 * Registers all handlers to be called whenever specific files get changed.
 */
export function registerAllFileWatchers() {
  notInWorkspaceFileWatchers.forEach(fw => fw &&watchFileNotInWorkspace(fw.glob, fw.handler));
}
