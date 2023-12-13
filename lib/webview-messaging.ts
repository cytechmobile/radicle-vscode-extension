import type { Webview } from 'vscode'
import { getVscodeRef } from '../src/webviews/src/utils/getVscodeRef'

interface Message<Command extends string, Payload extends object | undefined = undefined> {
  command: Command
  payload: Payload
}

type MessageToWebview = Message<'resetCount'>

type MessageToExtension = Message<'showInfoNotification', { text: string }>
// append more message types with `| Message<'...', SomeType>`

/** Sends a message, usually from the host window, to the provided webview. */
export function notifyWebview(message: MessageToWebview, webview: Webview): void {
  webview.postMessage(message)
}

/** Sends a message from within a webview to the VS Code extension hosting it. */
export function notifyExtension(message: MessageToExtension): void {
  getVscodeRef().postMessage(message)
}
