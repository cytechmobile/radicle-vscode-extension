import { ConfigurationTarget, workspace } from 'vscode'
import { assertUnreachable, exec } from '../utils'

/**
 * Lists they keys of configuration options available to the user along with
 * the possible types their values can have.
 *
 * PRE-CONDITIONS:
 * - Each config key has a matching entry in `contributes.configuration` defined
 * in package.json .
 */
export interface ExtensionConfig {
  'radicle.advanced.pathToRadBinary': string
  'radicle.advanced.pathToNodeHome': string
  'radicle.advanced.httpApiEndpoint': string
  'radicle.hideTempFiles': boolean
}

/**
 * Gets the value of a VS Code configuration option.
 *
 * @returns The configuration value if set by the user, otherwise the default value if
 * the config has one set, otherwise `undefined`.
 */
export function getConfig<K extends keyof ExtensionConfig>(
  configKey: K,
): ExtensionConfig[K] | undefined {
  const config = workspace.getConfiguration()

  switch (configKey) {
    case 'radicle.advanced.pathToRadBinary':
    case 'radicle.advanced.pathToNodeHome':
    case 'radicle.advanced.httpApiEndpoint':
      // if the config has the value of the empty string (default) then return `undefined`
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return config.get<ExtensionConfig[K]>(configKey)?.trim() || undefined
    case 'radicle.hideTempFiles':
      return config.get<ExtensionConfig[K]>(configKey)
    default:
      return assertUnreachable(configKey)
  }
}

/**
 * Sets the value of a VS Code configuration option.
 */
export function setConfig<K extends keyof ExtensionConfig>(
  configKey: K,
  value: ExtensionConfig[K],
): Thenable<void> {
  const config = workspace.getConfiguration()

  switch (configKey) {
    case 'radicle.advanced.pathToRadBinary':
    case 'radicle.advanced.pathToNodeHome':
    case 'radicle.advanced.httpApiEndpoint':
      return config.update(configKey, value, ConfigurationTarget.Global)
    case 'radicle.hideTempFiles':
      return config.update(configKey, value, ConfigurationTarget.Global)
    default:
      return assertUnreachable(configKey)
  }
}

/**
 * Resolves the absolute path to the Radicle CLI binary's __expected__ **directory**
 * (not the full path to the binary!) as per the https://radicle.xyz/install script
 *
 * @example
 * ```ts
 * getAbsolutePathToDefaultRadBinaryDirectory() // "/home/maninak/.radicle/bin/"
 * ```
 *
 * @returns The path if successfully resolved, otherwise `undefined`
 */
export function getAbsolutePathToDefaultRadBinaryDirectory(): string | undefined {
  const homeDir = exec('echo $HOME')
  const defaultPath = homeDir ? `${homeDir}/.radicle/bin/` : undefined

  return defaultPath
}

export const defaultRadBinaryLocation =
  process.platform === 'linux' || process.platform === 'darwin'
    ? '~/.radicle/bin/rad' // as per https://radicle.xyz/install
    : undefined

/**
 * Resolves the default path to the Radicle CLI binary _after having confirmed_ that the binary
 * is indeed there and accessible for command execution.
 *
 * @returns The path if successfully resolved, otherwise `undefined`
 */
export function getValidatedPathToDefaultRadBinaryLocation(): string | undefined {
  const isBinaryAtDefaultPath =
    defaultRadBinaryLocation && Boolean(exec(defaultRadBinaryLocation))

  return isBinaryAtDefaultPath ? defaultRadBinaryLocation : undefined
}

/**
 * Resolves the path to which the PATH alias`rad` points, if it is set in the shell and if
 * it indeed points to a Radicle CLI binary accessible for command execution.
 *
 * @returns The path if successfully resolved, otherwise `undefined`
 */
export function getValidatedPathToRadBinaryWhenAliased(): string | undefined {
  const aliasedPath = exec('which rad')
  if (!aliasedPath) {
    return undefined
  }

  const isBinaryAtAliasedPath = Boolean(exec(aliasedPath))

  return isBinaryAtAliasedPath ? aliasedPath : undefined
}

/**
 * Resolves the default path where the home for a Radicle node _is expected to be located_,
 * as per the installation script.
 *
 * @returns The path if successfully resolved, otherwise `undefined`
 * @see https://radicle.xyz/install
 */
// TODO: maninak memoize
export function getDefaultPathToNodeHome(): string | undefined {
  const homeDir = exec('echo $HOME')
  const defaultPath = homeDir ? `${homeDir}/.radicle` : undefined

  return defaultPath
}

/**
 * Resolves the _preferred_ path where the home for a Radicle node _is expected to be located_,
 * prioritizing user-defined configuration.
 *
 * If no home is is located at the resolved path, the CLI may create one automatically.
 *
 * @returns The path if successfully resolved, otherwise `undefined`
 */
export function getResolvedPathToNodeHome(): string | undefined {
  const path = getConfig('radicle.advanced.pathToNodeHome') ?? getDefaultPathToNodeHome()

  return path
}

/**
 * Composes a text to interpolate into log/notification messages, when there's need
 * to reference the Radicle node's resolved home path, but _only if it's the
 * non-default path_ (for brevity).
 *
 * @return The string ` stored in "${resolvedPathToNodeHome}"` (with a preceding space char)
 * if the resolved path is non-default, otherwise the empty string.
 */
export function composeNodeHomePathMsg(): string {
  const resolvedPathToNodeHome = getResolvedPathToNodeHome()
  const defaultPathToNodeHome = getDefaultPathToNodeHome()

  if (!resolvedPathToNodeHome) {
    throw new Error('Failed resolving path to node home')
  }

  const isResolvedPathToNodeHomeTheDefaultOne =
    resolvedPathToNodeHome === defaultPathToNodeHome

  const nodePathMsg = isResolvedPathToNodeHomeTheDefaultOne
    ? ''
    : ` stored in "${resolvedPathToNodeHome}"`

  return nodePathMsg
}
