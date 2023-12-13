import type { Webview } from 'vscode'

let vscode: ReturnType<typeof acquireVsCodeApi> | undefined

export function getVscodeRef() {
  if (vscode) {
    return vscode
  }

  return (vscode = acquireVsCodeApi())
}

export interface MessageToWebview {
  command: 'resetCount'
}

export function postMessageToWebview(message: MessageToWebview, webview: Webview): void {
  webview.postMessage(message)
}

export interface MessageToExtension {
  command: 'showInfoNotification'
  text: string
}

export function postMessageToExtension(message: MessageToExtension): void {
  getVscodeRef().postMessage(message)
}

// Source: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/vscode-webview/index.d.ts
/**
 * API exposed to webviews.
 *
 * @template StateType Type of the persisted state stored for the webview.
 */
export interface WebviewApi<StateType> {
  /**
   * Post a message to the owner of the webview.
   *
   * @param message Data to post. Must be JSON serializable.
   */
  postMessage(message: unknown): void

  /**
   * Get the persistent state stored for this webview.
   *
   * @return The current state or `undefined` if no state has been set.
   */
  getState(): StateType | undefined

  /**
   * Set the persistent state stored for this webview.
   *
   * @param newState New persisted state. This must be a JSON serializable object. Can be retrieved
   * using {@link getState}.
   *
   * @return The new state.
   */
  setState<T extends StateType | undefined>(newState: T): T
}

declare global {
  /**
   * Acquire an instance of the webview API.
   *
   * This may only be called once in a webview's context. Attempting to call `acquireVsCodeApi` after it has already
   * been called will throw an exception.
   *
   * @template StateType Type of the persisted state stored for the webview.
   */
  function acquireVsCodeApi<StateType = unknown>(): WebviewApi<StateType>
}
