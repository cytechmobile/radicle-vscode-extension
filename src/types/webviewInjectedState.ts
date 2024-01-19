import type { webviewId } from '../helpers'
import type { AugmentedPatch } from '../stores'
import type { Patch } from './httpd'

// TODO: maninak rename as PatchDetailWebviewState?
export interface PatchDetailInjectedState {
  kind: typeof webviewId
  id: Patch['id']
  state: {
    patch: AugmentedPatch & { isCheckedOut: boolean }
  }
}
