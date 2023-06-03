import type { ExtensionContext } from 'vscode'

let ctx: ExtensionContext

/**
 * Sets the global store with the extension's context.
 *
 * Should be called only once, at the very top of the `activate()` function.
 *
 * @param {ExtensionContext} extCtx The extension's context available in
 * the `activate()` function.
 */
export function initExtensionContext(extCtx: ExtensionContext): void {
  ctx = extCtx
}

/**
 * Allows caller to access the extension's context anywhere.
 *
 * @returns The extension's context.
 */
export function getExtensionContext(): ExtensionContext {
  return ctx
}
