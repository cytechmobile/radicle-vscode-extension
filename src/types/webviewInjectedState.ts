import type { AugmentedPatch, DId } from '../types'

export interface PatchDetailWebviewInjectedState {
  kind: 'webview-patch-detail'
  id: number
  state: {
    patch: AugmentedPatch & { isCheckedOut: boolean }
    timeLocale: Parameters<Date['toLocaleDateString']>['0']
    delegates: DId[]
    defaultBranch: string
    localIdentity?: { id: `did:key:${string}`; alias: string }
  }
}
