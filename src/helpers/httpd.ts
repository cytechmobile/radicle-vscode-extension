import { type $Fetch, FetchError, type FetchOptions, type FetchResponse, ofetch } from 'ofetch'
import type { XOR } from 'ts-xor'
import { log } from '../utils'
import { getConfig } from './config'

// Must manually be kept in sync with the shape returned by httpd
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

// Must manually be kept in sync with the shape returned by httpd
interface RadicleProject {
  id: string
  name: string
  description: string
  trackings?: number
}

interface HttpdPathMappedToResponseShape {
  '/': Root
  '/projects': RadicleProject[]
  // add new pairs here as needed
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
  doFetch = ofetch.create({ baseURL: getResolvedHttpdRootUrl(), timeout: 30_000 })
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
  const trailingSlashesRegex = /\/*$/
  const apiRootPath = '/api/v1'
  const httpEndpoint = (
    getConfig('radicle.advanced.httpApiEndpoint') ??
    '<vscode-settings.radicle.advanced.httpApiEndpoint must not be empty!>'
  ).replace(trailingSlashesRegex, '')

  const resolvedUrl = `${httpEndpoint}${apiRootPath}`.replace(trailingSlashesRegex, '')

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
    const response = await doFetch.raw<HttpdPathMappedToResponseShape[P]>(path, {
      method,
      body,
      ...(options ?? {}),
    })

    return { data: response._data as Exclude<typeof response._data, undefined>, response }
  } catch (error) {
    if (error instanceof FetchError) {
      log(error.message, 'error')

      return { error }
    }

    throw error // should be `throw new Error('Unhandled error in "fetchFromHttpd()"', { cause: error })` but TS ain't supporting it yet
  }
}
