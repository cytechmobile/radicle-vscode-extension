import { exec } from '../utils'
import {
  getConfig,
  getValidatedAliasedPathToRadBinary,
  getValidatedDefaultPathToRadBinary,
} from '.'

/**
 * Resolves a reference to Radicle CLI to be used for executing shell commands.
 *
 * @returns Either the path to the `rad` binary defined manually by the user via
 * config, or otherwise just the string `"rad"`.
 */
export async function getRadCliRef(): Promise<string> {
  const configPathToNodeHome = getConfig('radicle.advanced.pathToNodeHome')
  const envPathToNodeHome = configPathToNodeHome && `RAD_HOME=${configPathToNodeHome}`
  const envVars = [envPathToNodeHome]
  const parsedEnvVars = envVars.filter(Boolean).length ? `${envVars.join(' ')} ` : ''

  const radCliRef =
    getConfig('radicle.advanced.pathToRadBinary') ||
    (Boolean(await getValidatedAliasedPathToRadBinary()) && 'rad') ||
    (await getValidatedDefaultPathToRadBinary())
  const radCliRefWithEnvVars = `${parsedEnvVars}${radCliRef}`

  return radCliRefWithEnvVars
}

/**
 * Returns the absolute path to the _resolved_ Radicle CLI binary.
 *
 * @returns The path to the rad binary, if successfully resolved.
 */
export async function getRadCliPath(): Promise<string | undefined> {
  let radCliPath: string | undefined

  if (await isRadCliInstalled()) {
    radCliPath =
      getConfig('radicle.advanced.pathToRadBinary') ||
      (await getValidatedDefaultPathToRadBinary()) ||
      (await getValidatedAliasedPathToRadBinary())
  }

  return radCliPath
}

/**
 * Gets the version of the resolved Radicle CLI binary, if possible in semver format.
 *
 * @returns The version of the Radicle CLI, if successfully resolved.
 */
export async function getRadCliVersion(): Promise<string | undefined> {
  const version = await exec(`${await getRadCliRef()} --version`)
  const semverRegex = /\d+\.\d+\S*/g // https://regexr.com/7bevi
  const semver = version?.match(semverRegex)?.[0]

  return semver ?? version
}

/**
 * Answers whether the Radicle CLI is installed and resolveable on the host OS.
 *
 * @returns `true` if found, otherwise `false`.
 */
export async function isRadCliInstalled(): Promise<boolean> {
  const isInstalled = Boolean(await exec(await getRadCliRef()))

  return isInstalled
}

/**
 * Answers whether the Radicle node has a currently authenticated identity or not. The identity
 * must be fully accessible to the Radicle CLI, i.e. the key must have also been added to the
 * ssh-agent.
 *
 * @returns `true` if authenticated, otherwise `false`.
 */
export async function isRadCliAuthed(): Promise<boolean> {
  const radicleId = await getRadNodeSshKey('hash')
  const unlockedIds = await exec('ssh-add -l')
  if (!radicleId || !unlockedIds) {
    return false
  }

  const isAuthed = Boolean(unlockedIds?.includes(radicleId))

  return isAuthed
}

export async function getRadicleIdentity(format: 'DID' | 'NID'): Promise<string | undefined> {
  const radSelf = await exec(`${await getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const radicleIdFromRadSelfRegex =
    format === 'DID' ? /DID\s+(\S+)/g : /Node ID \(NID\)\s+(\S+)/g // https://regexr.com/7eam1
  const id = [...radSelf.matchAll(radicleIdFromRadSelfRegex)]?.[0]?.[1]

  return id
}

export async function getRadNodeSshKey(format: 'hash' | 'full'): Promise<string | undefined> {
  const radSelf = await exec(`${await getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const keyFromRadSelfRegex =
    format === 'hash' ? /Key \(hash\)\s+(\S+)/g : /Key \(full\)\s+(\S+ \S+)/g // https://regexr.com/7eaeh
  const key = [...radSelf.matchAll(keyFromRadSelfRegex)]?.[0]?.[1]

  return key
}

export async function getRadNodeStoragePath(): Promise<string | undefined> {
  const radSelf = await exec(`${await getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const radNodeStoragePath = [...radSelf.matchAll(/Storage \(git\)\s+(\S+)/g)]?.[0]?.[1] // https://regexr.com/7eam1

  return radNodeStoragePath
}