import type { AugmentedPatch } from '../types'
import type { Patch } from './httpd'

// TODO: maninak rename as PatchDetailWebviewState to account for more webviews in the future?
export interface PatchDetailInjectedState {
  kind: 'webview-patch-detail'
  id: Patch['id']
  state: {
    patch: AugmentedPatch & { isCheckedOut: boolean }
    localIdentity?: { id: `did:key:${string}`; alias?: string }
    timeLocale: Parameters<Date['toLocaleDateString']>['0']
  }
}
