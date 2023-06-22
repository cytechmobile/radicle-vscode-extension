import { spawnSync } from 'node:child_process'
import { getWorkspaceFolderPaths, log } from '.'

/**
 * Executes a shell command and returns a promise that resolves with the stdout of the
 * command.
 *
 * EXAMPLE:
 * ```ts
 * exec('echo "hello shell :)"')
 * //> hello shell:)
 * ```
 *
 * @param cmd - The shell command to execute. Can be a static string or a function resolving
 * the command dynamically.
 * @param options - Optional configuration.
 * @returns The output of the shell command if successful, otherwise `undefined`.
 */
export function exec(
  cmd: string | (() => string),
  options?: {
    /**
     * Specifies whether the output of the shell command should be logged in the Output panel
     * or not. If set to `false` and a command execution error occurs, then the error will be
     * logged in the Debug panel regardless (only visible during development).
     *
     * @default false
     */
    shouldLog?: boolean
    /**
     * Specifies the maximum amount of time (in milliseconds) that the shell command is
     * allowed to run before it is automatically terminated. If the command takes longer than
     * the specified timeout, it will be forcefully terminated and an error will be thrown.
     *
     * @default 5000
     */
    timeout?: number
    /**
     * If set to `true`, the stdout will be trimmed of any leading or trailing
     * whitespace before being returned. Otherwise the output will be returned as-is.
     * Especially useful for removing the common trailing new-line.
     *
     * @default true
     */
    outputTrimming?: boolean
    /**
     * Specifies the current working directory in which the shell command will be executed.
     * Can be either a string representing a specific directory path or the string
     * literal `'$workspaceDir'` indicating that the VS Code workspace should be used.
     *
     * @default undefined
     * */
    cwd?: (string & {}) | '$workspaceDir'
  },
): string | undefined {
  const opts = options ?? {}
  const resolvedCmd = typeof cmd === 'function' ? cmd() : cmd

  try {
    let cwd: string | undefined
    if (opts.cwd === '$workspaceDir') {
      const firstWorkspaceDir = getWorkspaceFolderPaths()?.[0] // Hack: always use only 0th folder
      if (!firstWorkspaceDir) {
        throw new Error(
          `Failed resolving path of workspace directory in order to exec "${resolvedCmd}" in it`,
        )
      }
      cwd = firstWorkspaceDir
    } else {
      cwd = opts.cwd
    }

    const execResult = spawnSync(resolvedCmd, {
      shell: true,
      cwd,
      timeout: opts.timeout ?? 5000,
      encoding: 'utf-8',
    })
    if (execResult.error || execResult.status) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw execResult.error ?? (execResult.stderr || execResult.stdout)
    }

    const parsedResult =
      opts.outputTrimming ?? true ? execResult.stdout.trim() : execResult.stdout
    if (opts.shouldLog ?? false) {
      log(parsedResult, 'info', resolvedCmd)
    }

    return parsedResult
  } catch (error) {
    const parsedError =
      typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : `Failed executing shell command: "${resolvedCmd}"`

    if (opts.shouldLog ?? false) {
      log(opts.outputTrimming ?? true ? parsedError.trim() : parsedError, 'error', resolvedCmd)
    } else {
      // will show up only in the Debug console during development
      console.error(parsedError)
    }

    return undefined
  }
}
