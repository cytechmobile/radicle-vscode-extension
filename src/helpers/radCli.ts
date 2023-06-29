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
 * config, or otherwise just the string `"rad"`
 * @throws If the reference to the Radicle Cli binary was not resolved successfully
 */
export function getRadCliRef(): string {
  const configPathToNodeHome = getConfig('radicle.advanced.pathToNodeHome')
  const envPathToNodeHome = configPathToNodeHome && `RAD_HOME=${configPathToNodeHome}`
  const envVars = [envPathToNodeHome]
  const parsedEnvVars = envVars.filter(Boolean).length ? `${envVars.join(' ')} ` : ''

  const radCliRef =
    getConfig('radicle.advanced.pathToRadBinary') ||
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (Boolean(getValidatedAliasedPathToRadBinary()) && 'rad') ||
    getValidatedDefaultPathToRadBinary()
  if (!radCliRef) {
    throw new Error('Failed resolving reference to Radicle Cli binary')
  }

  const radCliRefWithEnvVars = `${parsedEnvVars}${radCliRef}`

  return radCliRefWithEnvVars
}

/**
 * Resolves the absolute path to the _resolved_ Radicle CLI binary.
 *
 * @returns The path to the rad binary, if successfully resolved.
 */
export function getRadCliPath(): string | undefined {
  let radCliPath: string | undefined

  if (isRadCliInstalled()) {
    radCliPath =
      getConfig('radicle.advanced.pathToRadBinary') ??
      getValidatedDefaultPathToRadBinary() ??
      getValidatedAliasedPathToRadBinary()
  }

  return radCliPath
}

/**
 * Resolves the version of the resolved Radicle CLI binary, if possible in semver format.
 *
 * @returns The version of the Radicle CLI, if successfully resolved.
 */
export function getRadCliVersion(): string | undefined {
  const version = exec(`${getRadCliRef()} --version`)
  const semverRegex = /\d+\.\d+\S*/g // https://regexr.com/7bevi
  const semver = version?.match(semverRegex)?.[0]

  return semver ?? version
}

/**
 * Answers whether the Radicle CLI is installed and resolveable on the host OS.
 *
 * @returns `true` if found, otherwise `false`.
 */
export function isRadCliInstalled(): boolean {
  const isInstalled = Boolean(exec(getRadCliRef()))

  return isInstalled
}

/**
 * Answers whether the currently open workspace folder contains a Radicle initialized
 * git repository.
 *
 * @returns `true` if the workspace is a rad-initialized repo, otherwise `false`.
 */
export function isRadInitialized(): boolean {
  const isInitialized = Boolean(exec(`${getRadCliRef()} inspect`, { cwd: '$workspaceDir' }))

  return isInitialized
}

/**
 * Answers whether the Radicle node has a currently authenticated identity or not. The identity
 * must be fully accessible to the Radicle CLI, i.e. the key must have also been added to the
 * ssh-agent.
 *
 * @returns `true` if authenticated, otherwise `false`.
 */
export function isRadicleIdentityAuthed(): boolean {
  const sshKey = getRadNodeSshKey('hash')
  const unlockedIds = exec('ssh-add -l')
  if (!sshKey || !unlockedIds) {
    return false
  }

  const isAuthed = Boolean(unlockedIds.includes(sshKey))

  return isAuthed
}

/**
 * Resolves the Radicle identity found in the home directory of a node.
 *
 * @param format The format the identity should be in. Can be either
 * `DID` (e.g.: did:key:z6MkvAFBkdph6yXSZDkkVqf9FfCcvkG29JD4KbwwnGphDRLV) or
 * `NID` (e.g.: z6MkvAFBkdph6yXSZDkkVqf9FfCcvkG29JD4KbwwnGphDRLV).
 * @returns The identity if resolved, otherwise `undefined`
 */
export function getRadicleIdentity(format: 'DID' | 'NID'): string | undefined {
  const radSelf = exec(`${getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const radicleIdFromRadSelfRegex =
    format === 'DID' ? /DID\s+(\S+)/g : /Node ID \(NID\)\s+(\S+)/g // https://regexr.com/7eam1
  const id = [...radSelf.matchAll(radicleIdFromRadSelfRegex)][0]?.[1]

  return id
}

/**
 * Resolves the cryptographic public key of the Radicle identity found in the resolved
 * home directory of a node.
 *
 * @param format The format the key should be in. Can be either
 * `hash` (e.g.: SHA256:+ggv51RTNH8KlryICcYCnb67MXDyMjOpxQrIwP68xYU) or `full` (e.g.:
 * ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOlfJT4YlvXMI9h98D4SSswNV5S0voNrQaUZMCq0s0zK).
 * @returns The key if resolved, otherwise `undefined`
 */
export function getRadNodeSshKey(format: 'hash' | 'full'): string | undefined {
  const radSelf = exec(`${getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const keyFromRadSelfRegex =
    format === 'hash' ? /Key \(hash\)\s+(\S+)/g : /Key \(full\)\s+(\S+ \S+)/g // https://regexr.com/7eaeh
  const key = [...radSelf.matchAll(keyFromRadSelfRegex)][0]?.[1]

  return key
}

/**
 * Resolves the storage path of a Radicle node depending on the node's resolved home path.
 *
 * @returns The path if resolved, otherwise `undefined`
 */
export function getRadNodeStoragePath(): string | undefined {
  const radSelf = exec(`${getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const radNodeStoragePath = [...radSelf.matchAll(/Storage \(git\)\s+(\S+)/g)][0]?.[1] // https://regexr.com/7eam1

  return radNodeStoragePath
}
