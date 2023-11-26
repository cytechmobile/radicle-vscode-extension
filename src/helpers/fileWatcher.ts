import { RelativePattern, Uri, workspace } from 'vscode'
import {
  getRepoRoot,
  getWorkspaceFolderPaths,
  isGitRepo,
  setWhenClauseContext,
} from '../utils'
import {
  notifyUserRadCliNotResolvedAndMaybeTroubleshoot,
  patchesRefreshEventEmitter,
} from '../ux'
import { getExtensionContext } from '../store'
import { isRadCliInstalled, isRadInitialized } from '.'

// A very hacky and specialized wrapper. If it doesn't meet your use case, consider
// going manual instead of adapting it.
function watchFileNotInWorkspace(
  glob:
    | Parameters<typeof workspace.createFileSystemWatcher>['0']
    | (() => Parameters<typeof workspace.createFileSystemWatcher>['0']),
  handler: () => unknown,
): void {
  handler() // always run once on init

  const resolvedGlobPattern = typeof glob === 'function' ? glob() : glob

  const watcher = workspace.createFileSystemWatcher(resolvedGlobPattern)
  watcher.onDidCreate(handler)
  watcher.onDidChange(handler)
  watcher.onDidDelete(handler)

  getExtensionContext().subscriptions.push(watcher)
}

interface WatchFileNotInWorkspaceParam {
  glob: Parameters<typeof watchFileNotInWorkspace>['0']
  handler: Parameters<typeof watchFileNotInWorkspace>['1']
}

const notInWorkspaceFileWatchers = [
  {
    glob: () =>
      new RelativePattern(
        // `getRepoRoot()` will return undefined if user opens the extension on
        // a non-git-initialized folder, pointing our watcher to the wrong path.
        // We're doing a best effort using the first workspace folder instead
        // in case it is created later.
        Uri.file(`${getRepoRoot() ?? getWorkspaceFolderPaths()?.[0] ?? ''}/.git/`),
        'config',
      ),
    handler: () => {
      setWhenClauseContext('radicle.isRadInitialized', isRadInitialized())

      if (!isRadCliInstalled() && !isRadInitialized() && isGitRepo()) {
        notifyUserRadCliNotResolvedAndMaybeTroubleshoot()
      }
    },
  },
  {
    glob: () =>
      new RelativePattern(
        // `getRepoRoot()` will return undefined if user opens the extension on
        // a non-git-initialized folder, pointing our watcher to the wrong path.
        // We're doing a best effort using the first workspace folder instead
        // in case it is created later.
        Uri.file(`${getRepoRoot() ?? getWorkspaceFolderPaths()?.[0] ?? ''}/.git/`),
        'HEAD',
      ),
    handler: () => {
      patchesRefreshEventEmitter.fire(undefined)
    },
  },
  (() => {
    switch (process.platform) {
      case 'linux':
        return {
          glob: new RelativePattern(Uri.file('/usr/bin/'), 'rad'),
          handler: () => {
            setWhenClauseContext('radicle.isRadCliInstalled', isRadCliInstalled())
          },
        }
      case 'darwin':
        return {
          glob: new RelativePattern(Uri.file('~/.cargo/bin/'), 'rad'),
          handler: () => {
            setWhenClauseContext('radicle.isRadCliInstalled', isRadCliInstalled())
          },
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
  notInWorkspaceFileWatchers.forEach((fw) => {
    fw && watchFileNotInWorkspace(fw.glob, fw.handler)
  })
}
