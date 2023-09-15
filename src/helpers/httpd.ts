import { type $Fetch, FetchError, type FetchOptions, type FetchResponse, ofetch } from 'ofetch'
import type { XOR } from 'ts-xor'
import type { ArrayMinLength } from 'src/types'
import { log } from '../utils'
import { getConfig } from './config'

// NOTE: all types must be _manually_ kept in sync with the shape returned by httpd

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

interface Root {
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
  /**
   * POST-CONDITIONS:
   * - items are sorted by ascending timestamp (most recent item has highest array index)
   * - there will always be at least one item in the array
   */
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

type HttpdPathMappedToResponseShape = {
  // expand definition with new pairs here below as needed...
  '/': Root
  '/projects': Project[]
} & {
  [K: `/projects/rad:${string}`]: Project
} & {
  [K: `/projects/rad:${string}/patches`]: Patch[]
} & {
  [K: `/projects/rad:${string}/patches/${string}`]: Patch
}

type FetchFromHttpdReturn<P extends keyof HttpdPathMappedToResponseShape> = Promise<
  XOR<
    {
      data: HttpdPathMappedToResponseShape[P]
      response: FetchResponse<HttpdPathMappedToResponseShape[P]>
    },
    { error: FetchError<HttpdPathMappedToResponseShape[P]> }
  >
>
// if we ever use a proper reactive global store like pinia, `doFetch()` should move in there
// and a watcher should run `resetHttpdConnection()` upon change of config
// `radicle.advanced.httpApiEndpoint` (as of writing this, at least ^_^)
let doFetch: $Fetch

/**
 * Resets the connection with httpd.
 *
 * Should be run each time any of the dependencies get updated for them to take effect.
 */
export function resetHttpdConnection(): void {
  doFetch = ofetch.create({ baseURL: getResolvedHttpdRootUrl(), query: { perPage: 100 } })
}

export function removeTrailingSlashes(str: string): string {
  const trailingSlashesRegex = /\/*$/
  const strWithoutTrailingSlashes = str.replace(trailingSlashesRegex, '')

  return strWithoutTrailingSlashes
}

/**
 * Resolves the root URL of the Radicle HTTP API based on the value set in the settings.
 *
 * POST-CONDITIONS:
 * - the returned URL doesn't contain a trailing `/` char
 *
 * @example getResolvedHttpdRootUrl() // http://127.0.0.1:8080/api/v1
 *
 * @returns a string value representing the root URL of the Radicle API.
 */
function getResolvedHttpdRootUrl(): string {
  const apiRootPath = '/api/v1'
  const httpEndpoint = removeTrailingSlashes(
    getConfig('radicle.advanced.httpApiEndpoint') ??
      '<vscode-settings.radicle.advanced.httpApiEndpoint must not be empty!>',
  )

  const resolvedUrl = removeTrailingSlashes(`${httpEndpoint}${apiRootPath}`)

  return resolvedUrl
}

/**
 * An abstraction for idiomatic interaction with the Radicle HTTP API served by `httpd`.
 *
 * @example
 * ```ts
 * (await fetchFromHttpd('/')).data?.service // "radicle-httpd"
 * ```
 *
 * @example
 * ```ts
 * const { data: projects, error } = await fetchFromHttpd('/projects')
 * if (error) {
 *   notifyUserAboutFetchError(error) // optionally
 *   return
 * }
 * // use `projects` ...
 * ```
 *
 * @example
 * ```ts
 * const { error } = await fetchFromHttpd(
 *   `/projects/${projectId}/patches/${patchId}`,
 *   'PATCH',
 *   { state: 'merged' },
 * )
 * if (error) {
 *   notifyUserAboutFetchError(error)
 *   return false
 * }
 * return true
 * ```
 *
 * @param path The relative path (as seen from the API's root) to the resource we
 * want to access.
 * @param method Optionally the HTTP verb to be used in the request. Defaults to `'GET'`.
 * @param body The request body to be sent with the HTTP request. Optional if the method
 * is `'GET'` or `'DELETE'`
 * @param options Optionally additional request options.
 *
 * @returns Returns either an object with the properties
 * `data` (ready-to-use data of the response) and
 * `response` (complete response object with full context) if the request was successful,
 * or an object with the poperty
 * `error` (most times set with full context) if it isn't, but never both.
 */
// TODO: validate that response types for methods other than `GET` are correct and fix if not
// or use overloads exactly matching each path+verb combo for max strictness and explicitness
export async function fetchFromHttpd<P extends keyof HttpdPathMappedToResponseShape>(
  path: P,
  method?: 'GET',
  body?: undefined,
  options?: Omit<FetchOptions<'json'>, 'method' | 'body'>,
): FetchFromHttpdReturn<P>
export async function fetchFromHttpd<P extends keyof HttpdPathMappedToResponseShape>(
  path: P,
  method: 'POST' | 'PUT' | 'PATCH',
  body: Record<PropertyKey, unknown>,
  options?: Omit<FetchOptions<'json'>, 'method' | 'body'>,
): FetchFromHttpdReturn<P>
export async function fetchFromHttpd<P extends keyof HttpdPathMappedToResponseShape>(
  path: P,
  method: 'DELETE',
  body?: undefined,
  options?: Omit<FetchOptions<'json'>, 'method' | 'body'>,
): FetchFromHttpdReturn<P>

export async function fetchFromHttpd<P extends keyof HttpdPathMappedToResponseShape>(
  path: P,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: Record<PropertyKey, unknown>,
  options?: Omit<FetchOptions<'json'>, 'method' | 'body'>,
): FetchFromHttpdReturn<P> {
  if (!doFetch) {
    resetHttpdConnection()
  }

  try {
    const response = await doFetch.raw<HttpdPathMappedToResponseShape[P]>(
      removeTrailingSlashes(path), // httpd paths don't support trailing slashes
      {
        method,
        body,
        ...(path === '/'
          ? { ...(options ?? {}), query: { perPage: undefined } } // unset `perPage` for '/'
          : options ?? {}),
      },
    )

    return { data: response._data as Exclude<typeof response._data, undefined>, response }
  } catch (error) {
    if (error instanceof FetchError) {
      log(error.message, 'error')

      return { error }
    }

    throw error // should be `throw new Error('Unhandled error in "fetchFromHttpd()"', { cause: error })` but TS ain't supporting it yet
  }
}
