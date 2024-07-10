import { window } from 'vscode'
import { assertIsDefined } from './assertions'

// Accessible in the Output panel's dropdown, under the declared channel name
const outputLog = window.createOutputChannel('Radicle')

/**
 * Add a new log entry.
 * Visible in the the Output panel's dropdown.
 *
 * EXAMPLE:
 * ```ts
 * log('Thing done!', 'info', 'Trying thing...')
 * // [22:13:25 INFO] Trying thing...
 * // Thing done!
 * ```
 *
 * @param {string} body The main thing to be entered in the log.
 * @param {('info' | 'warn' | 'error')} severity The severity of the log entry.
 * @param {string} [context] Optionally a heading providing context to the body.
 */
export function log(
  body: string,
  severity: 'info' | 'warn' | 'error',
  context?: string,
): void {
  // timestamp as hh:mm:ss
  const ts = new Date().toTimeString().split(' ')[0] ?? new Date().toTimeString()
  const copy =
    (context && body ? `${context}\n${body}` : body || context) ?? '<unresolved message>'
  const logEntry = `[${ts} ${severity.padEnd(5).toUpperCase()}] ${copy}`

  outputLog.appendLine(logEntry)
  severity === 'error' && console.error(new Error(logEntry))
}

/**
 * Shows the extension's log in VS Code's Output panel.
 *
 * @param [shouldFocusOutput=true] - If false, the output window will not be focused.
 */
export function showLog(shouldFocusOutput = true): void {
  outputLog.show(!shouldFocusOutput)
}

/**
 * Asserts that the value passed will be defined at runtime. Logs before
 * throwing if the assertion fails.
 *
 * Best suited to let TypeScript know that an otherwise optional value is actually
 * expected to be always defined at this point of the execution and onwards.
 *
 * Should be used as a last resort tool when inference cannot be otherwise leveraged for TS to
 * reach the same conclusion and as a better alternative to a type assertion (a.k.a. `as`).
 *
 * @example
 * ```ts
 * const maybeValue: string | undefined = getValue()
 * assertIsDefinedAndLog(maybeValue)
 * // henceforth `maybeValue` is of type "string" as far as TS is concerned
 * ```
 */
export function assert<T>(value: T): asserts value is NonNullable<T> {
  try {
    assertIsDefined(value)
  } catch (err) {
    const error = err as Error
    const caller = error.stack?.split('\n')[3]?.trim().split(' ')[1]

    log(
      error.stack ?? '',
      'error',
      `Value in "${caller}()" was expected to be defined but wasn't`,
    )

    throw error
  }
}
