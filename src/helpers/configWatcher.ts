import { workspace } from 'vscode'
import {
  validateHideTempFilesConfigAlignment,
  validateHttpdConnection,
  validateRadCliInstallation,
  validateRadicleIdentityAuthentication,
} from '../ux/'
import { useEnvStore, usePatchStore } from '../stores'
import { type ExtensionConfig, resetHttpdConnection } from '.'

function onConfigChange(
  configKey: keyof ExtensionConfig,
  onChangeCallback: Parameters<typeof workspace.onDidChangeConfiguration>['0'],
): void {
  useEnvStore().extCtx.subscriptions.push(
    workspace.onDidChangeConfiguration((ev) => {
      if (ev.affectsConfiguration(configKey)) {
        onChangeCallback(ev)
      }
    }),
  )
}

interface OnConfigChangeParam {
  configKey: Parameters<typeof onConfigChange>['0']
  onConfigChange: Parameters<typeof onConfigChange>['1']
  onBeforeWatcherRegistration?: () => void
}

// TODO: maninak instead of calling stuff directly to change, onChange set the values in a new configStore and have other things depend on it
const configWatchers = [
  {
    configKey: 'radicle.advanced.pathToRadBinary',
    onConfigChange: () => {
      useEnvStore().refreshResolvedAbsolutePathToRadBinary()
      validateRadCliInstallation()
      validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
    },
  },
  {
    configKey: 'radicle.advanced.pathToNodeHome',
    onConfigChange: () => {
      useEnvStore().refreshLocalIdentity()
      // no need to notify since we check AND notify on rad command execution
      validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
      usePatchStore().resetAllPatches()
    },
  },
  {
    configKey: 'radicle.advanced.httpApiEndpoint',
    onConfigChange: () => {
      resetHttpdConnection()
      validateHttpdConnection()
      usePatchStore().resetAllPatches()
    },
  },
  {
    configKey: 'radicle.hideTempFiles',
    onConfigChange: validateHideTempFilesConfigAlignment,
    onBeforeWatcherRegistration: validateHideTempFilesConfigAlignment,
  },
] satisfies OnConfigChangeParam[]

/**
 * Registers all handlers to be called whenever the user changes a specific config
 * in the extension's settings.
 */
export function registerAllConfigWatchers(): void {
  configWatchers.forEach((cw) => {
    cw.onBeforeWatcherRegistration?.()
    onConfigChange(cw.configKey, cw.onConfigChange)
  })
}
