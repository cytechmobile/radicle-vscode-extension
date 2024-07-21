import type { DId, Patch, PatchStatus, Project, Revision } from '../types'

// TODO: change logic (and rename here and everywhere) to not get the latest revision but the most important one which is `patch.status === merged ? mergedRevision(s) ? latestRevision`

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

export function isLocalIdAuthedToEditPatchStatus(
  status: PatchStatus,
  delegates: Project['delegates'],
  firstRevision: Revision,
  localIdentityId: DId,
): boolean {
  if (status === 'merged') {
    return false
  }

  const isLocalIdAuthed = [
    ...delegates.map((delegate) => delegate.id),
    firstRevision.author.id,
  ].includes(localIdentityId)

  return isLocalIdAuthed
}
