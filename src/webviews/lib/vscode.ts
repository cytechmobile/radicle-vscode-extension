let vscode: ReturnType<typeof acquireVsCodeApi> | undefined  = undefined

export function getVscodeRef() {
  if (vscode) {
    return vscode
  }

  return vscode = acquireVsCodeApi()
}

export interface MessageToWebviewHost {
  command: 'showInfoNotification'
  text: string
}

export function postMessageToWebviewHost(message: MessageToWebviewHost): void {
  getVscodeRef().postMessage(message)
}
