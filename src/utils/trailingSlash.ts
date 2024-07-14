/**
 * Returns a new string without any slashes i.e. `/` at its end (if there were any).
 */
export function removeTrailingSlashes(str: string): string {
  const trailingSlashesRegex = /\/*$/
  const strWithoutTrailingSlashes = str.replace(trailingSlashesRegex, '')

  return strWithoutTrailingSlashes
}
