import type { Patch } from '.'

export interface AugmentedPatch extends Patch {
  lastFetchedTs: number
}
