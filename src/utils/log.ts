import { window } from 'vscode'
import type { ExtensionContext } from 'vscode'

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
  const copy = context ? `${context}\n${body}` : body

  const logEntry = `[${ts} ${severity.padEnd(5).toUpperCase()}] ${copy}`

  outputLog.appendLine(logEntry)
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
 * Append a new entry to the log with the extension activation event and version.
 */
export function logExtensionActivated(ctx: ExtensionContext): void {
  log(
    `Extension ${ctx.extension.packageJSON.displayName} v${ctx.extension.packageJSON.version} activated.`,
    'info',
  )
}
