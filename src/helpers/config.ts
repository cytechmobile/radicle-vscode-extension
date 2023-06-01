import { ConfigurationTarget, workspace } from 'vscode'
import { assertUnreachable, exec } from '../utils'

/**
 * Lists they keys of configuration options available to the user along with
 * the possible types their values can have.
 *
 * PRE_CONDITION:
 * Must be kept manually in sync with `contributes.configuration` defined in package.json .
 */
export interface ExtensionConfig {
  'radicle.advanced.pathToRadBinary': string
  'radicle.advanced.pathToNodeHome': string
}

/**
 * Gets the value of a VS Code configuration option.
 *
 * @returns The configuration value if set by the user, otherwise the default value if
 * the config has one set, otherwise `undefined`.
 */
export function getConfig<K extends keyof ExtensionConfig>(
  configKey: K,
): ExtensionConfig[typeof configKey] | undefined {
  const config = workspace.getConfiguration()

  switch (configKey) {
    case 'radicle.advanced.pathToRadBinary':
    case 'radicle.advanced.pathToNodeHome':
      return config.get<ExtensionConfig[typeof configKey]>(configKey)?.trim()
    default:
      return assertUnreachable(configKey)
  }
}

/**
 * Sets the value of a VS Code configuration option.
 */
export function setConfig<K extends keyof ExtensionConfig>(
  configKey: K,
  value: ExtensionConfig[typeof configKey],
): Thenable<void> {
  const config = workspace.getConfiguration()

  switch (configKey) {
    case 'radicle.advanced.pathToRadBinary':
    case 'radicle.advanced.pathToNodeHome':
      return config.update(configKey, value, ConfigurationTarget.Global)
    default:
      return assertUnreachable(configKey)
  }
}

export async function getDefaultPathToRadBinary(): Promise<string | undefined> {
  const homeDir = await exec('echo $HOME')
  const defaultPath = homeDir ? `${homeDir}/.radicle/bin/rad` : undefined

  return defaultPath
}

export async function getValidatedDefaultPathToRadBinary(): Promise<string | undefined> {
  const defaultPath = await getDefaultPathToRadBinary()

  if (!defaultPath) {
    return undefined
  }

  const isBinaryAtDefaultPath = Boolean(await exec(defaultPath))

  return isBinaryAtDefaultPath ? defaultPath : undefined
}

export async function getValidatedAliasedPathToRadBinary(): Promise<string | undefined> {
  const aliasedPath = await exec('which rad')
  if (!aliasedPath) {
    return undefined
  }

  const isBinaryAtAliasedPath = Boolean(await exec(aliasedPath))

  return isBinaryAtAliasedPath ? aliasedPath : undefined
}

export async function getDefaultPathToNodeHome(): Promise<string | undefined> {
  const homeDir = await exec('echo $HOME')
  const defaultPath = homeDir ? `${homeDir}/.radicle` : undefined

  return defaultPath
}

export async function getResolvedPathToNodeHome(): Promise<string | undefined> {
  const path =
    getConfig('radicle.advanced.pathToNodeHome') || (await getDefaultPathToNodeHome())

  return path
}
