import { fetch } from 'undici'
import { log } from '../utils'
import { getConfig } from './config'

/**
 * Resolves the root URL of the Radicle HTTP API based on the endpoint configured
 * in the settings.
 *
 * @example getApiRoot() // http://127.0.0.1:8080/api/v1
 *
 * @returns a string value representing the root URL of the Radicle API.
 * @throws if no endpoint to the Radicle HTTP API is configured in the settings
 */
export function getApiRoot(): string {
  const apiRootPath = '/api/v1' // should we be fetching and using NodeRoot.path instead?
  const httpEndpoint =
    getConfig('radicle.advanced.httpApiEndpoint') ?? '<radicle.advanced.httpApiEndpoint>'
  const apiRoot = `${httpEndpoint.replace(/\/$/, '')}${apiRootPath}`

  return apiRoot
}

interface RadicleProject {
  id: string
  name: string
  description: string
  trackings?: number
}

export async function fetchRadicleProjects(options?: {
  onError?: (requestUrl: string) => unknown
}): Promise<RadicleProject[] | undefined> {
  const apiProjects = `${getApiRoot()}/projects`

  try {
    const projects = (await (await fetch(apiProjects)).json()) as RadicleProject[]

    return projects
  } catch (error) {
    const errorMsg =
      typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : `Failed fetching Radicle projects`

    log(errorMsg, 'error', `Fetching "${apiProjects}"...`)
    options?.onError?.(apiProjects)

    return undefined
  }
}
