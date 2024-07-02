import type { AugmentedPatch } from '../types'
import type { Patch } from './httpd'

export interface PatchDetailWebviewInjectedState {
  kind: 'webview-patch-detail' // should be `PatchDetailWebviewId` when refactoring to extract code shared by extension and webview to a `lib` root dir happens
  id: Patch['id']
  state: {
    patch: AugmentedPatch & { isCheckedOut: boolean }
    timeLocale: Parameters<Date['toLocaleDateString']>['0']
    localIdentity?: { id: `did:key:${string}`; alias?: string }
    defaultBranch?: string
  }
}
