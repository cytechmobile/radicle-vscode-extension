import { watch } from 'node:fs'
import { join } from 'node:path'
import { commands, ExtensionMode } from 'vscode'
import { useEnvStore } from '../stores'

const RELOAD_DEBOUNCE_MS = 750

/**
 * Reloads the Extension Development Host window whenever the freshly built extension bundle
 * is detected on disk.
 *
 * No-op outside of development mode.
 */
export function registerExtensionHostAutoReload() {
  const ctx = useEnvStore().extCtx
  if (ctx.extensionMode !== ExtensionMode.Development) {
    return
  }

  let debounceTimeout: ReturnType<typeof setTimeout> | undefined
  function debouncedReloadWindow() {
    globalThis.clearTimeout(debounceTimeout)

    debounceTimeout = setTimeout(
      () => void commands.executeCommand('workbench.action.reloadWindow'),
      RELOAD_DEBOUNCE_MS,
    )
  }

  const watcher = watch(join(ctx.extensionPath, 'dist'), debouncedReloadWindow)
  ctx.subscriptions.push({ dispose: () => watcher.close() })
}
