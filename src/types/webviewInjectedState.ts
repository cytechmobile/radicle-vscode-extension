import type { Patch } from './httpd'

export interface PatchDetailInjectedState {
  kind: 'patchDetail'
  id: Patch['id']
  ts: number
  state: Patch
}
