import type { Webview } from 'vscode'
import { getVscodeRef } from '../webviews/src/utils/getVscodeRef'
import type { PatchDetailInjectedState } from '../types'

interface Message<Command extends string, Payload extends object | undefined = undefined> {
  command: Command
  payload: Payload
}

type MessageToWebview =
  | Message<'resetCount'>
  | Message<'updateState', PatchDetailInjectedState>

type MessageToExtension =
  | Message<'showInfoNotification', { text: string }>
  | Message<'copyToClipboardAndNotify', { textToCopy: string }>

/** Sends a message, usually from the host window, to the provided webview. */
export function notifyWebview(message: MessageToWebview, webview: Webview): void {
  webview.postMessage(message)
}

/** Sends a message from within a webview to the VS Code extension hosting it. */
export function notifyExtension(message: MessageToExtension): void {
  getVscodeRef().postMessage(message)
}
