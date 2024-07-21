import { access, constants } from 'node:fs'
import { RelativePattern, Uri, workspace } from 'vscode'
import { getRepoRoot, getWorkspaceFolderPaths, setWhenClauseContext } from '../utils'
import { validateRadCliInstallation } from '../ux'
import { useEnvStore, useGitStore } from '../stores'
import {
  getAbsolutePathToDefaultRadBinaryDirectory,
  getConfig,
  getResolvedPathToNodeHome,
  isRadCliInstalled,
  isRadInitialized,
} from '.'

interface FileWatcherConfig {
  glob:
    | Parameters<typeof workspace.createFileSystemWatcher>['0']
    | (() => Parameters<typeof workspace.createFileSystemWatcher>['0'])
  handler: () => unknown
  immediate?: boolean
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
  {
    glob: new RelativePattern(Uri.file(`${getResolvedPathToNodeHome()}/keys/`), 'radicle.pub'),
    handler: () => {
      useEnvStore().refreshLocalIdentity()
    },
    immediate: true,
  },
  // installation with script from https://radicle.xyz/install
  {
    glob: new RelativePattern(
      Uri.file(`${getAbsolutePathToDefaultRadBinaryDirectory()}/`),
      'rad',
    ),
    handler: onRadCliInstallationChanged,
  },
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
        handler: onRadCliInstallationChanged,
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
        handler: onRadCliInstallationChanged,
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

  /*
   * If the dir tree expected to contain `rad` binary didn't already exist,
   * nodejs file watchers won't fire events when that is subsequently created (e.g. Radicle
   * suite just got installed) so we need to resort to polling to detect that those initially
   * missing files later got added.
   */
  if (!isRadCliInstalled()) {
    notInWorkspaceFileWatchers.forEach((fileWatcherConfig) => {
      const glob = fileWatcherConfig.glob
      const resolvedGlob = typeof glob === 'function' ? glob() : glob

      if (resolvedGlob.pattern.match(/rad$/)) {
        const pathToRadBinary = `${resolvedGlob.baseUri.path}${resolvedGlob.pattern}`

        setTimeout(() => {
          access(pathToRadBinary, constants.R_OK | constants.X_OK, (err) => {
            if (!err) {
              onRadCliInstallationChanged()
              registerAllFileWatchers()
            }
          })
        }, 3_000)
      }
    })
  }
}

// A hacky and specialized wrapper. If it doesn't meet your use case, consider
// going manual instead of adapting it.
function watchFileNotInWorkspace({ glob, handler, immediate }: FileWatcherConfig): void {
  immediate && handler()

  const resolvedGlobPattern = typeof glob === 'function' ? glob() : glob

  const watcher = workspace.createFileSystemWatcher(resolvedGlobPattern)
  watcher.onDidCreate(handler)
  watcher.onDidChange(handler)
  watcher.onDidDelete(handler)

  useEnvStore().extCtx.subscriptions.push(watcher)
}

function onRadCliInstallationChanged() {
  validateRadCliInstallation() &&
    setWhenClauseContext('radicle.isRadInitialized', isRadInitialized())
}
