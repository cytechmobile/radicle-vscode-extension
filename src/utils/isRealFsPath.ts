import { statfsSync } from 'node:fs'

/**
 * Checks if a string expected to point to the filesystem is indeed that
 * and if that file/directory the path points to actually exists.
 *
 * Particularly useful for sanity checking untrusted strings before interpolating
 * into shell commands, protecting against shell injection attacks.
 *
 * Even if the return value is `true`, caution should still be applied as to
 * how the provided `unsanitizedPath` is subsequently being used!
 */
export function isRealFsPath(untrustedPath: string): boolean {
  try {
    Boolean(statfsSync(untrustedPath)) // throws if path does not resolve

    return true
  } catch {
    console.warn('Path check failed for untrusted value:', untrustedPath)

    return false
  }
}
