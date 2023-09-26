// NOTE: all types must be _manually_ kept in sync with the shape returned by httpd

import type { ArrayMinLength } from '.'

/**
 * Decentralized Identifier, commonly used for Radicle Identities
 */
export type Did = `did:key:${string}`[]

/**
 * a.k.a. RID
 */
export interface RadicleIdentity {
  id: Did
  alias: string
}

export interface HttpdRoot {
  message: string
  service: string
  version: string
  node: { id: string }
  path: string
  links: {
    href: string
    rel: string
    type: string
  }[]
}

export interface Project {
  id: string
  name: string
  description: string
  defaultBranch: string
  head: string
  delegates: Did[]
  patches: { [K in PatchStatus]: number }
  issues: { open: number; closed: number }
  trackings: number
}

export interface Merge {
  author: RadicleIdentity
  revision: string
  commit: string
  timestamp: number
}

export type PatchStatus = 'draft' | 'open' | 'archived' | 'merged'

export interface Patch {
  id: string
  title: string
  author: RadicleIdentity
  state: { status: PatchStatus }
  target: string
  labels: string[]
  merges: Merge[]
  assignees: string[]
  revisions: ArrayMinLength<Revision, 1>
}

export function isPatch(x: unknown): x is Patch {
  const patch = x as Partial<Patch> | undefined
  const isPatch =
    patch &&
    typeof patch.id === 'string' &&
    typeof patch.title === 'string' &&
    patch.author &&
    patch.state &&
    typeof patch.target === 'string' &&
    patch.labels &&
    patch.merges &&
    patch.assignees &&
    patch.revisions

  return Boolean(isPatch)
}

export interface Comment {
  id: string
  author: RadicleIdentity
  body: string
  reactions: [string, string][]
  timestamp: number
  replyTo: string | null
}

export type ReviewVerdict = 'accept' | 'reject' | null

export interface Review {
  author: RadicleIdentity
  verdict?: ReviewVerdict
  summary: string | null
  comments: string[]
  timestamp: number
}

export interface Revision {
  id: string
  author: RadicleIdentity
  description: string
  base: string
  /**
   * a.k.a. Object Identifier
   */
  oid: string
  discussions: Comment[]
  reviews: Review[]
  refs: string[]
  timestamp: number
}

export interface DiffResponse {
  diff: Changeset
  commits: Commit[]
  files: {
    [key: string]: {
      id: string
      binary: boolean
      content: string
      lastCommit: LastCommit
    }
  }
}

export interface Changeset {
  added: {
    diff: Diff
    new: FilechangeMeta
    path: string
  }[]
  deleted: {
    diff: Diff
    old: FilechangeMeta
    path: string
  }[]
  moved: MovedOrCopiedFilechange[]
  copied: MovedOrCopiedFilechange[]
  modified: {
    diff: Diff
    new: FilechangeMeta
    old: FilechangeMeta
    path: string
  }[]
  stats: {
    filesChanged: number
    insertions: number
    deletions: number
  }
}

interface MovedOrCopiedFilechange {
  diff: { type: 'empty' }
  newPath: string
  oldPath: string
}

export function isMovedOrCopiedFilechange(x: unknown): x is MovedOrCopiedFilechange {
  const filechange = x as MovedOrCopiedFilechange | undefined
  const isMoved = filechange && filechange.diff && filechange.newPath && filechange.oldPath

  return Boolean(isMoved)
}

export interface FilechangeMeta {
  oid: string
  mode: 'blob' | 'blobExecutable' | 'tree' | 'link' | 'commit'
}

export interface Diff {
  type: 'plain' | 'binary' | 'empty'
  hunks: Hunk[]
  eof: 'noneMissing' | 'oldMissing' | 'newMissing' | 'bothMissing'
}

export interface Hunk {
  header: string
  lines: HunkLine[]
  old: HunkRange
  new: HunkRange
}

export interface HunkLine {
  line: string
  lineNoOld?: number // TODO: maninak use latest rad cli and httpd and check if those props are indeed optional or not
  lineNoNew?: number
  type: 'context' | 'addition' | 'deletion' // TODO: maninak ensure this is not a union but HunkLine is a union instead (see JSON used in https://app.quicktype.io)
  lineNo?: number
}

export interface HunkRange {
  start: number
  end: number
}

export interface Commit {
  id: string
  summary: string
  description: string
  author: { name: string; email: string }
  committer: { name: string; email: string; time: number }
  parents: string[]
}

// TODO: maninak see how this correleates with Commit and refactor accordingly
export interface LastCommit {
  id: string
  summary: string
  description: string
  message: string
  // TODO: maninak check why author and committer here are the same and on Commit they are not, refactor accordingly
  author: { name: string; email: string; time: number }
  committer: { name: string; email: string; time: number }
  parents: string[]
}
