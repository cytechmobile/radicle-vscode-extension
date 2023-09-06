import { env, window } from 'vscode'

/**
 * Copies `val` to the user's clipboard and notifies the user of what was just copied.
 */
export async function copyToClipboardAndNotifify(val: string) {
  await env.clipboard.writeText(val)
  window.showInformationMessage(`"${val}" copied to clipboard`)
}
