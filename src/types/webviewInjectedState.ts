import type { AugmentedPatch } from '../types'
import type { Patch } from './httpd'

// TODO: maninak rename as PatchDetailWebviewState?
export interface PatchDetailInjectedState {
  kind: 'webview-patch-detail'
  id: Patch['id']
  state: {
    patch: AugmentedPatch & { isCheckedOut: boolean }
  }
}
