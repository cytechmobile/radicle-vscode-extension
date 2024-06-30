import type { PatchDetailWebviewId } from '../stores'
import type { AugmentedPatch } from '../types'
import type { Patch } from './httpd'

export interface PatchDetailWebviewInjectedState {
  kind: PatchDetailWebviewId
  id: Patch['id']
  state: {
    patch: AugmentedPatch & { isCheckedOut: boolean }
    localIdentity?: { id: `did:key:${string}`; alias?: string }
    timeLocale: Parameters<Date['toLocaleDateString']>['0']
  }
}
