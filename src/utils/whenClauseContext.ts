import { commands } from 'vscode'

/**
 * Definition of custom `when` clause context keys extending the built-in ones
 * @see https://code.visualstudio.com/api/references/when-clause-contexts
 */
interface CustomWhenClauseContextKeys {
  'radicle.isRadCliInstalled': boolean
  'radicle.isRadInitialized': boolean
}

/**
 * Sets a custom context key to be used in `when` clauses of package.json definitions.
 *
 * @param key - The custom key to set in the context.
 * @param value - The value of the custom key.
 */
export function setWhenClauseContext<K extends keyof CustomWhenClauseContextKeys>(
  key: K,
  value: CustomWhenClauseContextKeys[K],
): void {
  commands.executeCommand('setContext', key, value)
}
