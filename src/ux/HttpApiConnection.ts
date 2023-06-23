import { window } from 'vscode'
import { fetch } from 'undici'
import { getConfig } from '../helpers'
import { log } from '../utils'

/**
 * Will check if connection to a Radicle API endpoint can be established, log either way,
 * and depending on the `minimizeUserNotifications` optional param, may notify the user of
 * the result.
 *
 * @returns `true` if connection could be established, otherwise `false`.
 */
export async function validateHttpApiEndpointConnection(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<boolean> {
  const endpoint = getConfig('radicle.advanced.httpApiEndpoint')

  if (!endpoint) {
    throw new Error('No endpoint to the Radicle HTTP API is set')
  }

  try {
    const response = await fetch(endpoint)

    if (!response.ok) {
      throw new Error(
        `Received non-OK status "${response.status}" from Radicle HTTP API at "${endpoint}"`,
      )
    }

    if (((await response.json()) as { service?: string }).service !== 'radicle-httpd') {
      throw new Error(`HTTP API at "${endpoint}" doesn't seem to be a Radicle API`)
    }

    const msg = `Connected with Radicle HTTP API at "${endpoint}"`
    log(msg, 'info')
    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return true
  } catch (error) {
    const errorMsg =
      typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : `Failed fetching Radicle HTTP API root`
    log(errorMsg, 'error', `Fetching "${endpoint}"...`)

    !options.minimizeUserNotifications &&
      window.showErrorMessage(`Failed establishing connection with Radicle HTTP API \
      at "${endpoint}. \
      Please ensure that "radicle-httpd" is already running and the address to the API's \
      root endpoint is correctly set in the extension's settings."`)

    return false
  }
}