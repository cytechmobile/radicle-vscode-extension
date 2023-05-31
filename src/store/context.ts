import type { ExtensionContext } from 'vscode'

let ctx: ExtensionContext

export function initExtensionContext(newCtx: ExtensionContext): void {
  ctx = newCtx
}

export function getExtensionContext(): ExtensionContext {
  return ctx
}
