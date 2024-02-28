import { workspace } from 'vscode'
import {
  validateHttpdConnection,
  validateRadCliInstallation,
  validateRadicleIdentityAuthentication,
} from '../ux/'
import { getExtensionContext, usePatchStore } from '../stores'
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

// TODO: maninak instead of calling stuff directly to change, onChange set the values in a new configStore and have other things depend on it
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
      usePatchStore().resetAllPatches()
    },
  },
  {
    configKey: 'radicle.advanced.httpApiEndpoint',
    onChangeCallback: () => {
      resetHttpdConnection()
      validateHttpdConnection()
      usePatchStore().resetAllPatches()
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
