/**
 * Truncates a string, if needed, replacing its middle chars with an ellipses (`…`).
 * @param {string} str The string to potentialy truncate
 * @default 8
 * @param {number} maxTotalCharsToShow The count of maximmum total chars
 * that`str` can have (excluding the ellipses). If `str` is longer than that number,
 * it will be truncated.
 * @returns If truncated, the `str` the beginning and ending of which will contain
 * `Math.floor(maxTotalCharsToShow/2)` count of original chars and an ellipses in the middle.
 * Otherwise, the original `str`.
 */
export function truncateMiddle(str: string, maxTotalCharsToShow: number = 8): string {
  if (str.length <= maxTotalCharsToShow) {
    return str
  }

  const prefix = str.substring(0, maxTotalCharsToShow / 2)
  const suffix = str.substring(str.length - maxTotalCharsToShow / 2)
  const ellipses = '…'

  return `${prefix}${ellipses}${suffix}`
}

/**
 * Takes a string as input and returns a shortened value that statistically should
 * still be enough to avoid collisions for large pools of hash values.
 *
 * Best use for "eye-balling" and visual reference. For machine matching using
 * the full hash value instead is recommended.
 *
 * @example
 * ```ts
 * shortenHash('8dc745bcd9759758ee7621f94687c0a345e0fc7d') // 8dc745b
 * ```
 *
 * @param {string} hash A string representing a hash value.
 * @returns The first 7 characters of the given hash value.
 */
export function shortenHash(hash: string): string {
  const charsToKeep = 7 // As done by git by default https://github.com/git/git/blob/dce96489162b05ae3463741f7f0365ff56f0de36/environment.c#L18
  const shortenedHash = hash.substring(0, charsToKeep)

  return shortenedHash
}

/**
 * Returns the given string with its first letter capitalized.
 *
 * @example
 * ```ts
 * capitalizeFirstLetter('john rambo') // John rambo
 * ```
 */
export function capitalizeFirstLetter(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}
