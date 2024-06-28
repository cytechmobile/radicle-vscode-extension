import { RelativePattern, Uri, workspace } from 'vscode'
import { getRepoRoot, getWorkspaceFolderPaths, setWhenClauseContext } from '../utils'
import { validateRadCliInstallation } from '../ux'
import { getExtensionContext, useEnvStore, useGitStore } from '../stores'
import { getConfig, getFullDefaultPathToRadBinaryDirectory, isRadInitialized } from '.'

interface FileWatcherConfig {
  glob:
    | Parameters<typeof workspace.createFileSystemWatcher>['0']
    | (() => Parameters<typeof workspace.createFileSystemWatcher>['0'])
  handler: () => unknown
  immediate?: boolean
}

// A very hacky and specialized wrapper. If it doesn't meet your use case, consider
// going manual instead of adapting it.
function watchFileNotInWorkspace({ glob, handler, immediate }: FileWatcherConfig): void {
  immediate && handler()

  const resolvedGlobPattern = typeof glob === 'function' ? glob() : glob

  const watcher = workspace.createFileSystemWatcher(resolvedGlobPattern)
  watcher.onDidCreate(handler)
  watcher.onDidChange(handler)
  watcher.onDidDelete(handler)

  getExtensionContext().subscriptions.push(watcher)
}

// TODO: maninak call setWhenClauseContext inside the stores as an effect??
// TODO: maninak replace `getRepoRoot()` with gitStore access?
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
      useEnvStore().refreshCurrentRepoId() // doesn't _need_ to be immediate but ok for now
      setWhenClauseContext('radicle.isRadInitialized', isRadInitialized())
    },
    immediate: true,
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
      useGitStore().refreshCurentBranch()
    },
  },
  // installation with script from https://radicle.xyz/install
  (() => {
    const fullDefaultPathToRadBinaryDirectory = getFullDefaultPathToRadBinaryDirectory()
    if (!fullDefaultPathToRadBinaryDirectory) {
      return undefined
    }

    switch (process.platform) {
      case 'linux':
      case 'darwin':
        return {
          glob: new RelativePattern(Uri.file(fullDefaultPathToRadBinaryDirectory), 'rad'),
          handler: () => {
            validateRadCliInstallation()
            setWhenClauseContext('radicle.isRadInitialized', isRadInitialized())
          },
        }
      default:
        return undefined
    }
  })(),
  // installation with package manager
  (() => {
    let pathToRadBinaryDirWithTrailingSlash: `${string}/` | undefined
    switch (process.platform) {
      case 'linux':
        pathToRadBinaryDirWithTrailingSlash = '/usr/bin/'
        break
      case 'darwin':
        pathToRadBinaryDirWithTrailingSlash = '~/.cargo/bin/'
        break
    }

    if (pathToRadBinaryDirWithTrailingSlash) {
      return {
        glob: new RelativePattern(Uri.file(pathToRadBinaryDirWithTrailingSlash), 'rad'),
        handler: () => {
          validateRadCliInstallation()
          setWhenClauseContext('radicle.isRadInitialized', isRadInitialized())
        },
      }
    }

    return undefined
  })(),
  // installation into some user-selected directory
  (() => {
    // TODO: maninak re-register all file watchers when this config changes value
    const customPathToRadBinaryDirWithTrailingSlash = getConfig(
      'radicle.advanced.pathToRadBinary',
    )?.replace(/rad$/, '')
    if (customPathToRadBinaryDirWithTrailingSlash) {
      return {
        glob: new RelativePattern(Uri.file(customPathToRadBinaryDirWithTrailingSlash), 'rad'),
        handler: () => {
          validateRadCliInstallation()
          setWhenClauseContext('radicle.isRadInitialized', isRadInitialized())
        },
      }
    }

    return undefined
  })(),
].filter(Boolean) satisfies FileWatcherConfig[]

/**
 * Registers all handlers to be called whenever specific files get changed.
 */
export function registerAllFileWatchers() {
  notInWorkspaceFileWatchers.forEach((fileWatcherConfig) => {
    watchFileNotInWorkspace(fileWatcherConfig)
  })
}
