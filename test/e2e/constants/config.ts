import { arch, platform, tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

export const testingWorkspacePath = join(tmpdir(), 'radicle-vscode-extension-e2e-workspace')

export const rootDir = join(__dirname, '../../..')

/** The path to a disposable directory used as `$HOME` for the entire e2e run. */
export const emulatedHomePath = join(tmpdir(), 'radicle-vscode-extension-e2e-home')
export const nodeHomePath = join(emulatedHomePath, '.radicle')
export const radicleBinPath = join(nodeHomePath, 'bin')
export const radCliPath = join(radicleBinPath, 'rad')
export const httpdPath = join(radicleBinPath, 'radicle-httpd')
/** Where the Radicle CLI binary is moved to in order to emulate it being uninstalled. */
export const backupRadCliPath = `${radCliPath}.uninstalled`

export const httpdHost = '127.0.0.1'
export const httpdPort = 8080

export const nodePidFilePath = join(emulatedHomePath, 'radicle-node.pid')
export const httpdPidFilePath = join(emulatedHomePath, 'radicle-httpd.pid')

export const sandboxedPath = `${radicleBinPath}${delimiter}${process.env['PATH'] ?? ''}`
export const radCliVersion = process.env['RADICLE_VERSION']?.trim() || undefined
export const httpdVersion = process.env['RADICLE_HTTPD_VERSION']?.trim() || 'latest'

export const supportedVscodeVersion =
  // eslint-disable-next-line ts/no-require-imports, ts/no-unsafe-member-access
  (require('../../../package.json').engines.vscode as string).replace(/^\^/, '')

export const wdioCachePath = join(rootDir, 'node_modules', '.cache', 'wdio')
export const chromedriverPath = join(
  wdioCachePath,
  platform() === 'win32' ? 'chromedriver.exe' : 'chromedriver',
)
export const wdioVideoPath = join(rootDir, 'node_modules', '.wdio-video')

/** The disposable `$HOME` for a single worker, isolated from every other worker's. */
export function getWorkerHomePath(workerIndex: number): string {
  return join(tmpdir(), `radicle-vscode-extension-e2e-home-${workerIndex}`)
}

export function getWorkerNodeHomePath(workerIndex: number): string {
  return join(getWorkerHomePath(workerIndex), '.radicle')
}

export function getWorkerRadicleBinPath(workerIndex: number): string {
  return join(getWorkerNodeHomePath(workerIndex), 'bin')
}

/** The disposable workspace a single worker's VS Code opens, isolated from every other's. */
export function getWorkerWorkspacePath(workerIndex: number): string {
  return join(tmpdir(), `radicle-vscode-extension-e2e-workspace-${workerIndex}`)
}

/** Matches every per-worker home, so a crashed run's leftovers get swept on the next setup. */
export const workerHomeNamePattern = /^radicle-vscode-extension-e2e-home-\d+$/

/** Matches every per-worker workspace, swept alongside the homes. */
export const workerWorkspaceNamePattern = /^radicle-vscode-extension-e2e-workspace-\d+$/

export function resolveReleaseTargetTriple(): string {
  const osArch = `${platform()}/${arch()}`

  switch (osArch) {
    case 'darwin/arm64':
      return 'aarch64-apple-darwin'
    case 'darwin/x64':
      return 'x86_64-apple-darwin'
    case 'linux/arm64':
      return 'aarch64-unknown-linux-musl'
    case 'linux/x64':
      return 'x86_64-unknown-linux-musl'
    default:
      throw new Error(
        `Unsupported OS/arch for e2e tests: "${osArch}". ` +
          `Supported: macOS (arm64/x64) and Linux (arm64/x64).`,
      )
  }
}

/** Maps the host OS/arch to the Chrome-for-Testing platform segment used in download URLs. */
export function resolveChromeForTestingPlatform(): string {
  const osArch = `${platform()}/${arch()}`

  switch (osArch) {
    case 'darwin/arm64':
      return 'mac-arm64'
    case 'darwin/x64':
      return 'mac-x64'
    case 'linux/x64':
      return 'linux64'
    default:
      throw new Error(
        `Unsupported OS/arch for chromedriver: "${osArch}". ` +
          `Chrome for Testing publishes builds for macOS (arm64/x64) and Linux (x64).`,
      )
  }
}
