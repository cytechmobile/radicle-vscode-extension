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
