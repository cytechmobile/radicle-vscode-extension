import { readFile } from 'node:fs/promises'

/**
 * Checks if a file contains a specific text.
 *
 * @param filePath The path to the file of which the contents are to be checked
 * @param text The text to search for.
 * @returns `true` if text is found in the file, otherwise `false`.
 */
export async function doesFileContainText(filePath: string, text: string): Promise<boolean> {
  const contents = await readFile(filePath, 'utf-8')
  const isTextInFile = contents.includes(text)

  return isTextInFile
}
