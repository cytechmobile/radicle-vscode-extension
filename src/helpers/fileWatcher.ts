import { RelativePattern, Uri, workspace } from 'vscode'
import {
  getRepoRoot,
  getWorkspaceFolderPaths,
  isGitRepo,
  setWhenClauseContext,
} from '../utils'
import { notifyUserRadCliNotResolvedAndMaybeTroubleshoot } from '../ux'
import { isRadCliInstalled, isRepoRadInitialised, isRepoRadPublished } from '.'

// A very hacky and specialized wrapper. If it doesn't meet your use case, consider
// going manual instead of adapting it.
async function watchFileNotInWorkspace(
  glob:
    | Parameters<typeof workspace.createFileSystemWatcher>['0']
    | (() => Promise<Parameters<typeof workspace.createFileSystemWatcher>['0']>),
  handler: () => unknown,
): Promise<void> {
  handler() // always run once on init

  const resolvedGlobPattern = typeof glob === 'function' ? await glob() : glob

  const watcher = workspace.createFileSystemWatcher(resolvedGlobPattern)
  watcher.onDidCreate(handler)
  watcher.onDidChange(handler)
  watcher.onDidDelete(handler)
}

interface WatchFileNotInWorkspaceParam {
  glob: Parameters<typeof watchFileNotInWorkspace>['0']
  handler: Parameters<typeof watchFileNotInWorkspace>['1']
}

const notInWorkspaceFileWatchers = [
  {
    glob: async () =>
      new RelativePattern(
        // `getRepoRoot()` will return undefined if user opens the extension on
        // a non-git-initialized folder, pointing our watcher to the wrong path.
        // We're doing a best effort using the first workspace folder instead.
        Uri.file(`${(await getRepoRoot()) ?? getWorkspaceFolderPaths()?.[0] ?? ''}/.git/`),
        'config',
      ),
    handler: async () => {
      setWhenClauseContext('radicle.isRepoRadInitialised', await isRepoRadInitialised())
      setWhenClauseContext('radicle.isRepoRadPublished', await isRepoRadPublished())

      if (
        !(await isRadCliInstalled()) &&
        !(await isRepoRadPublished()) &&
        (await isGitRepo())
      ) {
        notifyUserRadCliNotResolvedAndMaybeTroubleshoot()
      }
    },
  },
  (() => {
    switch (process.platform) {
      case 'linux':
        return {
          glob: new RelativePattern(Uri.file('/usr/bin/'), 'rad'),
          handler: async () =>
            setWhenClauseContext('radicle.isRadCliInstalled', await isRadCliInstalled()),
        }
      case 'darwin':
        return {
          glob: new RelativePattern(Uri.file('~/.cargo/bin/'), 'rad'),
          handler: async () =>
            setWhenClauseContext('radicle.isRadCliInstalled', await isRadCliInstalled()),
        }
      default:
        return undefined
    }
  })(),
] satisfies (WatchFileNotInWorkspaceParam | undefined)[]

/**
 * Registers all handlers to be called whenever specific files get changed.
 */
export function registerAllFileWatchers(): void {
  notInWorkspaceFileWatchers.forEach(
    (fw) => fw && watchFileNotInWorkspace(fw.glob, fw.handler),
  )
}
