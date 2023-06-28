import { window } from 'vscode'
import { fetch } from 'undici'
import { getApiRoot } from '../helpers'
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
  const apiRoot = getApiRoot()

  try {
    const response = await fetch(apiRoot)

    if (!response.ok) {
      throw new Error(
        `Received non-OK status "${response.status}" from Radicle HTTP API at "${apiRoot}"`,
      )
    }

    if (((await response.json()) as { service?: string }).service !== 'radicle-httpd') {
      throw new Error(`HTTP API at "${apiRoot}" doesn't seem to be a Radicle API`)
    }

    const msg = `Connected with Radicle HTTP API at "${apiRoot}"`
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
    log(errorMsg, 'error', `Fetching "${apiRoot}"...`)

    !options.minimizeUserNotifications &&
      window.showErrorMessage(`Failed establishing connection with Radicle HTTP API \
      at "${apiRoot}. \
      Please ensure that "radicle-httpd" is already running and the address to the API's \
      root endpoint is correctly set in the extension's settings."`)

    return false
  }
}
