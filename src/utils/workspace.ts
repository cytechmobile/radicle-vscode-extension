import { workspace } from 'vscode'

/**
 * Returns an array with the paths of each open folder in the workspace or `undefined`
 * if no workspace has been opened.
 */
export function getWorkspaceFolderPaths(): string[] | undefined {
  const dirs = workspace.workspaceFolders?.map((folder) => folder.uri.fsPath)

  return dirs
}
