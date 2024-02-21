// NOTE: all types must be _manually_ kept in sync with the shape returned by httpd

import type { ArrayMinLength } from '.'

/**
 * Decentralized Identifier, commonly used for Radicle Identities
 */
export type Did = `did:key:${string}`

export interface RadicleIdentity {
  id: Did
  alias?: string
}

export interface HttpdRoot {
  message: string
  service: string
  version: string
  node: { id: string } // TODO: maninak handle breaking change https://radicle.zulipchat.com/#narrow/stream/369278-web/topic/breaking.20changes.20in.20HTTPD/near/409172640
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
  trackings: number // TODO: maninak rename to seeding
}

export interface Merge {
  author: RadicleIdentity
  revision: string
  commit: string
  timestamp: number
}

export interface Patch {
  id: string
  title: string
  author: RadicleIdentity
  state:
    | { status: 'draft' }
    | { status: 'open'; conflicts?: [string, string][] }
    | { status: 'archived' }
    | { status: 'merged'; revision: string; commit: string } // TODO: maninak utilize new `revision` field
  target: string
  labels: string[]
  merges: Merge[]
  assignees: string[]
  revisions: ArrayMinLength<Revision, 1>
}

export type PatchStatus = Patch['state']['status']

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

export interface Revision {
  id: string
  author: RadicleIdentity
  description: string
  edits: {
    author: RadicleIdentity
    body: string
    embeds: Embed[]
    timestamp: number
  }[]
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
  reviews: Review[]
  timestamp: number
}

export interface Comment {
  id: string
  author: RadicleIdentity
  body: string
  edits: Edit[]
  embeds: Embed[]
  resolved: boolean
  reactions: { emoji: string; authors: string[] }[]
  location?: CodeLocation
  replyTo?: string
  timestamp: number
}

export interface Edit {
  author: RadicleIdentity
  body: string
  embeds: Embed[]
  timestamp: number
}

export interface Embed {
  name: string
  content: string
}

export interface Review {
  author: RadicleIdentity
  verdict?: 'accept' | 'reject'
  summary?: string
  comment?: string
  inline?: CommentInlineWithCode[]
  timestamp: number
}
export interface CommentInlineWithCode {
  location: CodeLocation
  comment: string
  timestamp: number
}

interface CodeLocation {
  path: string
  commit: string
  lines: {
    start: number
    end: number
  }
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
  added: { diff: Diff; new: FileRef; path: string }[]
  deleted: { diff: Diff; old: FileRef; path: string }[]
  moved: MovedOrCopiedFilechange[]
  copied: MovedOrCopiedFilechange[]
  modified: { diff: Diff; new: FileRef; old: FileRef; path: string }[]
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

export interface FileRef {
  /**
   * Can be used as key to resolve a file under `DiffResponse.files`
   */
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
  lineNoOld?: number // TODO: use latest rad cli and httpd and check if those props are indeed optional or not
  lineNoNew?: number
  type: 'context' | 'addition' | 'deletion' // TODO: ensure this is not a union but HunkLine is a union instead (see JSON used in https://app.quicktype.io)
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

// TODO: see how this correleates with Commit and refactor accordingly
export interface LastCommit {
  id: string
  summary: string
  description: string
  message: string
  // TODO: check why author and committer here are the same and on Commit they are not, refactor accordingly
  author: { name: string; email: string; time: number }
  committer: { name: string; email: string; time: number }
  parents: string[]
}
