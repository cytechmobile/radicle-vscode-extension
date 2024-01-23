import { window } from 'vscode'
import { effect } from '@vue/reactivity'
import { usePatchStore } from '../stores'
import { getTimeAgo } from '../utils'
import { patchesTreeDataProvider } from '../ux'

/**
 * Initializes and registers all Views dependent on a JS provider.
 */
export function registerAllViews(): void {
  registerPatchesView()
}

function registerPatchesView() {
  const patchesView = window.createTreeView('patches-view', {
    treeDataProvider: patchesTreeDataProvider,
    showCollapseAll: true,
  })

  const updatePatchesViewDescription = effect(() => {
    const patchCount = usePatchStore().patches?.length
    const formattedPatchCount = typeof patchCount === 'number' ? `${patchCount} · ` : ''

    const lastFetchedTs = usePatchStore().lastFetchedTs
    if (lastFetchedTs) {
      patchesView.description = `${formattedPatchCount}Updated ${getTimeAgo(lastFetchedTs)}`
    }
  })
  setInterval(() => {
    updatePatchesViewDescription()
  }, 30_000)
}
