import { window } from 'vscode'
import { patchesTreeDataProvider } from '../ux'

/**
 * Initializes and registers all Views dependent on a JS provider.
 */
export function registerAllViews(): void {
  window.createTreeView('patches-view', { treeDataProvider: patchesTreeDataProvider })
}
