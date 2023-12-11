import { Uri, type Webview } from 'vscode'

// TODO: maninak document
export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}
