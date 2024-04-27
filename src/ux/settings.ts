import { sep } from 'node:path'
import { ConfigurationTarget, commands, workspace } from 'vscode'
import { extTempDir } from '../constants'
import { getConfig } from '../helpers'
import { log } from '../utils'

/**
 * Opens the Settings UI with the options filtered to show only the specified config
 *
 * POST-CONDITIONS:
 * - The correct scope, `User` or `Workspace`, will be automatically selected based on
 * which is actually being evaluated as the effective one.
 */
export function openSettingsFocusedAtConfig(config: Parameters<typeof getConfig>['0']): void {
  const configDetails = workspace.getConfiguration().inspect(config)

  commands.executeCommand(
    `workbench.action.open${configDetails?.workspaceValue ? 'Workspace' : ''}Settings`,
    config,
  )
}

/**
 * Checks extension config for user's desired behaviour and ensure's the
 * native vscode config is set to match.
 */
export function validateHideTempFilesConfigAlignment() {
  const excludeGlob = `${extTempDir}${sep}**`

  const shouldExclude = getConfig('radicle.hideTempFiles')

  const searchExcludeConfigKey = 'search.exclude'
  const searchExcludeConfig = workspace.getConfiguration().get<object>(searchExcludeConfigKey)

  if (!searchExcludeConfig) {
    log(
      `Didn't find any configuration for key "${searchExcludeConfigKey}". Bailing validation of config alignment.`,
      'warn',
    )

    return
  }

  const isAlreadyConfigedToExclude = Boolean(
    Object.entries(searchExcludeConfig).find(
      ([key, value]) => key === excludeGlob && value === true,
    ),
  )

  if (shouldExclude && !isAlreadyConfigedToExclude) {
    const newSearchExcludeConfig = { ...searchExcludeConfig, [excludeGlob]: true }
    workspace
      .getConfiguration()
      .update(searchExcludeConfigKey, newSearchExcludeConfig, ConfigurationTarget.Global)
  } else if (!shouldExclude && isAlreadyConfigedToExclude) {
    // @ts-expect-error Type '{}' has no matching index signature for type 'string'.
    const { [excludeGlob]: _, ...searchExcludeConfigWithoutExcludeGlob } = searchExcludeConfig
    workspace
      .getConfiguration()
      .update(
        searchExcludeConfigKey,
        searchExcludeConfigWithoutExcludeGlob,
        ConfigurationTarget.Global,
      )
  }
}
