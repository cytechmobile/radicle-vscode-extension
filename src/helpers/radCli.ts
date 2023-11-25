import { assertUnreachable, exec, getCurrentGitBranch, shortenHash } from '../utils'
import type { Patch } from '../types'
import {
  getConfig,
  getResolvedPathToNodeHome,
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
 * Answers whether the Radicle node has an identity with an encrypted key.
 *
 * An unencrypted Radicle identity can be the result of a user deciding to use a blank
 * passphrase when creating it.
 *
 * @returns `true` if encrypted, `false` if unencrypted, or `undefined` if execution
 * is unsuccessful.
 */
export function isRadicleIdentityKeyEncrypted(): boolean | undefined {
  const pathToNodeHome = getResolvedPathToNodeHome()
  if (!pathToNodeHome) {
    return undefined
  }

  const keyInfo = exec(`openssl base64 -d -in ${pathToNodeHome}/keys/radicle | strings`)
  if (!keyInfo) {
    return undefined
  }

  const isEncrypted = keyInfo.includes('aes256') // the CLI's chosen cypher as of coding this
  const isUnencrypted = keyInfo.includes('none') // if the above fails, this should work enough
  const verdict = isEncrypted || !isUnencrypted

  return verdict
}

/**
 * Answers whether the Radicle node has a currently authenticated identity or not. The identity
 * must be fully accessible to the Radicle CLI, i.e. its key must have also been added to the
 * ssh-agent.
 *
 * @returns `true` if authenticated, otherwise `false`.
 */
export function isRadicleIdentityAuthed(): boolean {
  const sshKey = getNodeSshKey('fingerprint')
  const unlockedIds = exec('ssh-add -l')
  if (!sshKey || !unlockedIds) {
    return false
  }

  const isAuthed = Boolean(unlockedIds.includes(sshKey))

  return isAuthed
}

/**
 * Resolves the Radicle identity and associated alias found in the home directory of a node.
 *
 * POST-CONDITIONS:
 * - the returned identity will be keyed with the value of `format` param
 *
 * @param format The format the identity should be in. Can be either
 * `DID` representing a Decentrilized Identity of a Radicle user
 * (e.g.: did:key:z6MkvAFBkdph6yXSZDkkVqf9FfCcvkG29JD4KbwwnGphDRLV)
 * or `NID` representing the identifier of the Radicle Node of that user
 * (e.g.: z6MkvAFBkdph6yXSZDkkVqf9FfCcvkG29JD4KbwwnGphDRLV).
 *
 * @returns An object containing both the identity and alias if resolved,
 * otherwise `undefined`. The object implements it's own `toString()` in the format
 * ```ts
 * `"${alias}" "${id}"`
 * ```
 */
export function getRadicleIdentity(
  format: 'DID',
): { DID: string; alias: string; toString: () => string } | undefined
export function getRadicleIdentity(
  format: 'NID',
): { NID: string; alias: string; toString: () => string } | undefined

export function getRadicleIdentity(format: 'DID' | 'NID') {
  let flag: string
  switch (format) {
    case 'DID':
      flag = '--did'
      break
    case 'NID':
      flag = '--nid'
      break
    default:
      assertUnreachable(format)
  }

  const id = exec(`${getRadCliRef()} self ${flag}`)
  const alias = exec(`${getRadCliRef()} self --alias`)

  if (!id || !alias) {
    // assumes each Radicle identity always comes with an associated alias
    return undefined
  }

  return { [format]: id, alias, toString: () => `"${alias}" "${id}"` } as const
}

/**
 * Resolves the Repository Identifier (RID) of the currently open workspace directory.
 *
 * @returns The RID if resolved, otherwise `undefined`.
 */
export function getRepoId(): `rad:${string}` | undefined {
  const maybeRid = exec(`${getRadCliRef()} inspect --rid`, { cwd: '$workspaceDir' })

  function isStrARid(str: string | undefined): str is `rad:${string}` {
    return Boolean(str?.startsWith('rad:'))
  }

  return isStrARid(maybeRid) ? maybeRid : undefined
}

/**
 * Answers whether the associated branch of the provided radicle `patch` is the
 * currenctly checked out git branch.
 */
export function isPatchCheckedOut(patch: Pick<Patch, 'id'>): boolean {
  const branchName = getCurrentGitBranch()
  const isCheckedOut = Boolean(branchName?.includes(shortenHash(patch.id)))

  return isCheckedOut
}

/**
 * Resolves the cryptographic public key of the Radicle identity found in the resolved
 * home directory of a node.
 *
 * @param format The format the key should be in. Can be either
 * `hash` (e.g.: SHA256:+ggv51RTNH8KlryICcYCnb67MXDyMjOpxQrIwP68xYU) or `full` (e.g.:
 * ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOlfJT4YlvXMI9h98D4SSswNV5S0voNrQaUZMCq0s0zK).
 * @returns The key if resolved, otherwise `undefined`.
 */
export function getNodeSshKey(format: 'fingerprint' | 'full'): string | undefined {
  let flag: string
  switch (format) {
    case 'fingerprint':
      flag = '--ssh-fingerprint'
      break
    case 'full':
      flag = '--ssh-key'
      break
    default:
      assertUnreachable(format)
  }

  const nodeSshKey = exec(`${getRadCliRef()} self ${flag}`)

  return nodeSshKey
}
