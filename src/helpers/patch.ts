import type { DId, Patch, PatchStatus, Revision } from '../types'

// TODO: change logic (and rename here and everywhere) to not get the latest revision but the most important one which is `patch.status === merged ? mergedRevision(s) ? latestRevision`

/**
 * Returns the chronologically first and latest revisions of a patch, sorted by timestamp.
 *
 * @param patch - The patch whose revisions to sort and extract.
 */
export function getFirstAndLatestRevisions(patch: Patch): {
  firstRevision: Revision
  latestRevision: Revision
} {
  const revisionsSortedOldestFirst = [...patch.revisions].sort(
    (p1, p2) => p1.timestamp - p2.timestamp,
  )
  const firstRevision = revisionsSortedOldestFirst[0] as Exclude<
    (typeof patch.revisions)[number],
    undefined
  >
  const latestRevision = revisionsSortedOldestFirst.at(-1) as Exclude<
    (typeof patch.revisions)[number],
    undefined
  >

  return { firstRevision, latestRevision }
}

/**
 * Returns whether the local Radicle identity is authorised to change the status of a patch.
 *
 * Delegates and the author of the first revision can edit status; merged patches are locked.
 *
 * @param status - The current status of the patch.
 * @param delegates - The list of delegate IDs for the repository.
 * @param firstRevision - The first (oldest) revision of the patch.
 * @param localIdentityId - The DID of the currently authenticated local identity.
 */
export function isLocalIdAuthedToEditPatchStatus(
  status: PatchStatus,
  delegates: DId[],
  firstRevision: Revision,
  localIdentityId: DId,
): boolean {
  if (status === 'merged') {
    return false
  }

  const isLocalIdAuthed = [...delegates, firstRevision.author.id].includes(localIdentityId)

  return isLocalIdAuthed
}
