import { workspace } from 'vscode'
import {
  refreshPatchesEventEmitter,
  validateHttpdConnection,
  validateRadCliInstallation,
  validateRadicleIdentityAuthentication,
} from '../ux/'
import { getExtensionContext } from '../store'
import { type ExtensionConfig, resetHttpdConnection } from '.'

function onConfigChange(
  configKey: keyof ExtensionConfig,
  onChangeCallback: Parameters<typeof workspace.onDidChangeConfiguration>['0'],
): void {
  getExtensionContext().subscriptions.push(
    workspace.onDidChangeConfiguration((ev) => {
      if (ev.affectsConfiguration(configKey)) {
        onChangeCallback(ev)
      }
    }),
  )
}

interface OnConfigChangeParam {
  configKey: Parameters<typeof onConfigChange>['0']
  onChangeCallback: Parameters<typeof onConfigChange>['1']
}

const configWatchers = [
  {
    configKey: 'radicle.advanced.pathToRadBinary',
    onChangeCallback: () => {
      validateRadCliInstallation()
      validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
    },
  },
  {
    configKey: 'radicle.advanced.pathToNodeHome',
    onChangeCallback: () => {
      // no need to notify since we check AND notify on rad command execution
      validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
      refreshPatchesEventEmitter.fire(undefined)
    },
  },
  {
    configKey: 'radicle.advanced.httpApiEndpoint',
    onChangeCallback: () => {
      resetHttpdConnection()
      validateHttpdConnection()
      refreshPatchesEventEmitter.fire(undefined)
    },
  },
] satisfies OnConfigChangeParam[]

/**
 * Registers all handlers to be called whenever the user changes a specific config
 * in the extension's settings.
 */
export function registerAllConfigWatchers(): void {
  configWatchers.forEach((cw) => {
    onConfigChange(cw.configKey, cw.onChangeCallback)
  })
}
