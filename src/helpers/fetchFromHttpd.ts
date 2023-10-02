import { type $Fetch, FetchError, type FetchOptions, type FetchResponse, ofetch } from 'ofetch'
import type { XOR } from 'ts-xor'
import type { DiffResponse, HttpdRoot, Patch, PatchStatus, Project } from '../types'
import { log } from '../utils'
import { getConfig } from './config'

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

type FetchFromHttpdReturn<Data extends object> = Promise<
  XOR<{ data: Data; response: FetchResponse<Data> }, { error: FetchError<Data> }>
>

/**
 * An abstraction for idiomatic interaction with the Radicle HTTP API served by `httpd`.
 *
 * @example Simple request
 * ```ts
 * (await fetchFromHttpd('/')).data?.service // "radicle-httpd"
 * ```
 *
 * @example GET request with error handling
 * ```ts
 * const { data: projects, error } = await fetchFromHttpd('/projects')
 * if (error) {
 *   notifyUserAboutFetchError(error) // optionally
 *   return
 * }
 * // use `projects` ...
 * ```
 *
 * @example PATCH request with error handling
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
 * @param path The relative path (as seen from the API's root) to the resource we want to access.
 * @param method Optionally the HTTP verb to be used in the request. Defaults to `'GET'`.
 * @param body The request body to be sent with the HTTP request. Optional if the method is `'GET'` or `'DELETE'`
 * @param options Optionally additional request options.
 *
 * @returns Returns either an object with the properties `data` (ready-to-use data of the response) and`response` (complete response object with full context) if the request was successful, or an object with the poperty `error` (most times set with full context) if it isn't, but never both.
 */

/*
 * Extend the documentation of httpd API by adding new overload signatures here as needed.
 *
 * Overload signatures _must_ be sorted having the one with the longest `path` at the top
 * to shortest one at the botttom or TS gets confused matching a call to the right signature.
 *
 * Signatures with non-`GET` `method`, should always have that field required.
 */
export async function fetchFromHttpd(
  path: `/projects/rad:${string}/patches/${string}`,
  method: 'PATCH',
  body?: object & { state: PatchStatus },
  options?: object,
): FetchFromHttpdReturn<Patch>
export async function fetchFromHttpd(
  path: `/projects/rad:${string}/patches/${string}`,
  method?: 'GET',
  body?: object,
  options?: object,
): FetchFromHttpdReturn<Patch>
export async function fetchFromHttpd(
  path: `/projects/rad:${string}/patches`,
  method?: 'GET',
  body?: object,
  options?: object,
): FetchFromHttpdReturn<Patch[]>
export async function fetchFromHttpd<RevBase extends string, RevOid extends string>(
  path: `/projects/rad:${string}/diff/${RevBase}/${RevOid}`,
  method?: 'GET',
  body?: object,
  options?: object,
): FetchFromHttpdReturn<DiffResponse>
export async function fetchFromHttpd(
  path: `/projects/rad:${string}`,
  method?: 'GET',
  body?: object,
  options?: object,
): FetchFromHttpdReturn<Project>
export async function fetchFromHttpd(
  path: '/projects',
  method?: 'GET',
  body?: undefined,
  options?: object,
): FetchFromHttpdReturn<Project[]>
export async function fetchFromHttpd(
  path: '/',
  method?: 'GET',
  body?: undefined,
  options?: undefined,
): FetchFromHttpdReturn<HttpdRoot>

export async function fetchFromHttpd<Data extends object>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object,
  options?: Omit<FetchOptions<'json'>, 'method' | 'body'>,
): FetchFromHttpdReturn<Data> {
  if (!doFetch) {
    resetHttpdConnection()
  }

  try {
    const response = await doFetch.raw<Data>(
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

function removeTrailingSlashes(str: string): string {
  const trailingSlashesRegex = /\/*$/
  const strWithoutTrailingSlashes = str.replace(trailingSlashesRegex, '')

  return strWithoutTrailingSlashes
}
