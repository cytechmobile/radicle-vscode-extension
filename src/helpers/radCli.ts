import type { Patch } from '../types'
import { useEnvStore } from '../stores'
import { assertUnreachable, isRealFsPath, log } from '../utils'
import { exec, execRad, getResolvedPathToNodeHome } from '.'

/**
 * Resolves the version of the resolved Radicle CLI binary, if possible in semver format.
 *
 * @returns The version of the Radicle CLI, if successfully resolved.
 */
export function getRadCliVersion(): string | undefined {
  const { stdout: version } = execRad(['--version'])
  const semverRegex = /\d+\.\d+\S*/g // https://regexr.com/7bevi
  const semver = version?.match(semverRegex)?.[0]

  return semver ?? version
}

// TODO: maninak move to envStore and make reactive
/**
 * Answers whether the Radicle CLI is installed and resolveable on the host OS.
 *
 * @returns `true` if found, otherwise `false`.
 */
export function isRadCliInstalled(): boolean {
  const { stdout } = execRad()

  return Boolean(stdout)
}

// TODO: maninak move to envStore and make reactive
/**
 * Answers whether the currently open workspace folder contains a Radicle initialized
 * git repository.
 *
 * @returns `true` if the workspace is a rad-initialized repo, otherwise `false`.
 */
export function isRadInitialized(): boolean {
  const isInitialized = Boolean(getCurrentRepoId())

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
  if (!isRealFsPath(pathToNodeHome)) {
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
): { DID: `did:key:${string}`; alias: string; toString: () => string } | undefined
export function getRadicleIdentity(
  format: 'NID',
): { NID: string; alias: string; toString: () => string } | undefined // eslint-disable-next-line padding-line-between-statements
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

  const { stdout: id } = execRad(['self', flag])
  const { stdout: alias } = execRad(['self', '--alias'])

  if (!id || !alias) {
    // assumes each local Radicle identity always comes with an associated alias
    return undefined
  }

  return { [format]: id, alias, toString: () => `"${alias}" "${id}"` } as const
}

/**
 * Resolves the Radicle repository id (RID) of the currently open workspace
 * directory.
 *
 * @returns The RID if resolved, otherwise `undefined`.
 */
export function getCurrentRepoId(): `rad:${string}` | undefined {
  const { stdout: maybeRid } = execRad(['inspect', '--rid'], { cwd: '$workspaceDir' })

  function isStrARid(str: string | undefined): str is `rad:${string}` {
    return Boolean(str?.startsWith('rad:'))
  }

  return isStrARid(maybeRid) ? maybeRid : undefined
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

  const { stdout: nodeSshKey, errorCode } = execRad(['self', flag])

  return errorCode ? undefined : nodeSshKey
}

/**
 * Performs edition of the patch's title and description on Radicle. Effectively
 * it's editing the first patch revision.
 *
 * @returns An object with the outcome of the editing operation plus additional details
 * when available
 */
export function editPatch(
  patchId: Patch['id'],
  newTitle: string,
  newDescr: string,
  timeoutSeconds?: number,
): { outcome: 'success'; didAnnounce: boolean } | { outcome: 'failure'; errorMsg: string } {
  const rid = useEnvStore().currentRepoId
  if (!rid) {
    const errorMsg = 'Unable to resolve current repo id in `updatePatchTitleAndDescription()`'
    log(errorMsg, 'error')

    return { outcome: 'failure', errorMsg }
  }

  // TODO: maninak authguard
  const execResult = execRad(
    ['patch', 'edit', patchId, '--repo', rid, '--message', newTitle, '--message', newDescr],
    { shouldLog: true, timeout: timeoutSeconds ? timeoutSeconds * 1000 : undefined },
  )

  if (execResult.errorCode) {
    return {
      outcome: 'failure',
      errorMsg: `${execResult.stdout}\n${execResult.stderr}\n${execResult.errorCode}`,
    }
  } else if (execResult.stdout?.includes('Node is stopped')) {
    return { outcome: 'success', didAnnounce: false }
  } else {
    return { outcome: 'success', didAnnounce: true }
  }
}
