import { cpus } from 'node:os'
import type {
  CodeLocation,
  Embed,
  Merge,
  NId,
  Patch,
  Project,
  RadicleIdentity,
  Reaction,
  Review,
} from '../types'
import { execRad, execRadAsync } from './exec'

export async function retrieveAllPatches(rid: Project['id']) {
  const patchIds = retrieveAllPatchIds(rid)

  const patchResolvers = patchIds.map(
    (patchId) => async () => await retrieveOnePatch(patchId, rid),
  )

  const patches = await resolveConcurrently(patchResolvers)

  return patches
}

async function retrieveOnePatch(
  patchId: Patch['id'],
  rid: Project['id'],
): Promise<Patch | undefined> {
  const { stdout: stringifiedPatch } = await execRadAsync([
    'cob',
    'show',
    '--repo',
    rid,
    '--type',
    'xyz.radicle.patch',
    '--object',
    patchId,
  ])
  if (stringifiedPatch) {
    // TODO: maninak try/catch
    const parsedPatch = JSON.parse(stringifiedPatch) as CobPatch
    const patch = transformCobPatch(parsedPatch)

    return patch
  } else {
    throw new Error(`Error retrieving details for patch ${patchId}`)
  }
}

function retrieveAllPatchIds(rid: Project['id']): Patch['id'][] {
  const { stdout: patchIds } = execRad([
    'cob',
    'list',
    '--repo',
    rid,
    '--type',
    'xyz.radicle.patch',
  ])
  if (patchIds) {
    return patchIds.trim().split('\n')
  } else {
    // TODO: maninak
    throw new Error(`Error retrieving patch ids`)
  }
}

function transformCobPatch(cobPatch: CobPatch): Patch | undefined {
  try {
    const revisions = Object.entries(cobPatch.revisions)
      .map(([id, revision]) => {
        if (!revision) {
          return undefined
        }

        return {
          ...revision,
          id,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          description: revision.description.sort((d1, d2) => d1.timestamp - d2.timestamp)[0]!
            .body,
          edits: revision.description.map((descr) => ({
            ...descr,
            author: { id: `did:key:${descr.author}` as const },
            timestamp: descr.timestamp / 1_000,
          })),
          reviews: Object.entries(revision.reviews).map(([id, review]) => ({
            id,
            ...review,
            timestamp: review.timestamp / 1_000,
          })),
          timestamp: revision.timestamp / 1_000,
        }
      })
      .filter(Boolean)

    const patchId = revisions.sort((r1, r2) => r1.timestamp - r2.timestamp)[0]?.id as string

    const merges = Object.entries(cobPatch.merges).map(([nid, merge]) => ({
      ...merge,
      author: { id: `did:key:${nid}` as const },
      timestamp: merge.timestamp / 1_000,
    }))

    const reviews = Object.values(cobPatch.reviews)

    const transformedPatch = { id: patchId, ...cobPatch, merges, revisions, reviews }

    return transformedPatch
  } catch (err) {
    console.error(err)

    return undefined
  }
}

type CobPatch = Omit<Patch, 'id' | 'revisions' | 'merges'> & {
  revisions: {
    [K in string]: {
      author: RadicleIdentity
      description: {
        author: NId
        body: string
        embeds: Embed[]
        timestamp: number
      }[]
      reactions: (Reaction & { location?: CodeLocation })[]
      /**
       * The value is a commit hash
       */
      base: string
      /**
       * a.k.a. Object Identifier. The value is a commit hash.
       */
      oid: string
      refs: string[]
      discussions: Comment[]
      reviews: { [K in string]: Omit<Review, 'id'> }
      timestamp: number
    }
  }
} & {
  merges: { [K in string]: Omit<Merge, 'author'> }
}

async function resolveConcurrently<T>(
  jobs: (() => Promise<T>)[],
  maxConcurrentJobs?: number,
): Promise<T[]> {
  const results: T[] = []
  const pending = new Set<Promise<void>>()
  const limit =
    maxConcurrentJobs && maxConcurrentJobs > 0
      ? maxConcurrentJobs
      : Math.ceil(cpus().length * 0.85)

  for (const job of jobs) {
    const promise = job()
      .then((result) => {
        results.push(result)
        pending.delete(promise)
      })
      .catch((error) => {
        console.error(`Error executing promise: ${(error as Error).message}`)
        pending.delete(promise)
      })

    pending.add(promise)
    if (pending.size >= limit) {
      await Promise.race(pending)
      await new Promise((resolve) => setTimeout(resolve, 0)) // Without this Node.js crashes
    }
  }

  await Promise.all(pending)

  return results
}
