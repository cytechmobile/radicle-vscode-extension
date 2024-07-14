import {
  type ExecFileSyncOptionsWithStringEncoding,
  type SpawnSyncOptionsWithStringEncoding,
  execFileSync,
  spawnSync,
} from 'node:child_process'
import type { XOR } from 'ts-xor'
import { useEnvStore } from '../stores'
import { getWorkspaceFolderPaths, log, truncateKeepWords } from '../utils'
import { getConfig } from './config'

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
     * List of string arguments for the given command.
     */
    args?: string[]
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
     * Setting it to `0` will disable the timeout.
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
    cwd?: (string & {}) | '$workspaceDir' // eslint-disable-line @typescript-eslint/ban-types
    env?: SpawnSyncOptionsWithStringEncoding['env']
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

    const spawnOpts: SpawnSyncOptionsWithStringEncoding = {
      shell: true,
      cwd,
      timeout: opts.timeout ?? 30_000,
      encoding: 'utf-8',
      env: { ...process.env, ...opts.env },
    }

    const execResult = spawnSync(resolvedCmd, (opts.args ?? []).map(maybeEscapeArg), spawnOpts)
    if (execResult.error || execResult.status) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw execResult.error ?? (execResult.stderr || execResult.stdout)
    }

    const parsedResult =
      opts.outputTrimming ?? true ? execResult.stdout.trim() : execResult.stdout
    if (opts.shouldLog ?? false) {
      log(
        parsedResult,
        'info',
        `${resolvedCmd} ${options?.args ? options.args.map(maybeEscapeArg).join(' ') : ''}`,
      )
    }

    return parsedResult
  } catch (error) {
    const fullCmd = `${resolvedCmd} ${
      options?.args ? options.args.map(maybeEscapeArg).join(' ') : ''
    }`
    const parsedError =
      typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : `Failed executing shell command: "${resolvedCmd}"`

    if (opts.shouldLog ?? false) {
      log(opts.outputTrimming ?? true ? parsedError.trim() : parsedError, 'error', fullCmd)
    }

    // will show up only in the Debug console during development
    console.error(fullCmd)

    return undefined
  }
}

// TODO: maninak add option `currentRepo = true` auto-adding arg `['--repo', useEnvStore().currentRepoId]`
// TODO: maninak support async calling
// TODO: maninak write JSDoc for func
export function execRad(
  args: string[] = [],
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
     * Setting it to `0` will disable the timeout.
     *
     * @default 30_000
     */
    timeout?: number
    /**
     * Specifies the current working directory in which the shell command will be executed.
     * Can be either a string representing a specific directory path or the string
     * literal `'$workspaceDir'` indicating that the VS Code workspace should be used.
     *
     * @default undefined
     * */
    cwd?: (string & {}) | '$workspaceDir' // eslint-disable-line @typescript-eslint/ban-types
    env?: ExecFileSyncOptionsWithStringEncoding['env']
  },
): XOR<{ stdout: string }, { errorCode: string | number; stdout?: string; stderr?: string }> {
  const opts = options ?? {}

  const truncatedRadCmd = `rad ${args
    .map((arg) => maybeEscapeArg(truncateKeepWords(arg, 40, ' […]')))
    .join(' ')}`

  try {
    let cwd: string | undefined
    // TODO: maninak extract to getWorskapaceDir and deduplicate
    if (opts.cwd === '$workspaceDir') {
      const firstWorkspaceDir = getWorkspaceFolderPaths()?.[0] // Hack: always use only 0th folder
      if (!firstWorkspaceDir) {
        throw new Error(
          `Failed resolving path of workspace directory in order to exec "${truncatedRadCmd}" in it`,
        )
      }
      cwd = firstWorkspaceDir
    } else {
      cwd = opts.cwd
    }

    const configPathToNodeHome = getConfig('radicle.advanced.pathToNodeHome')
    const spawnOpts: ExecFileSyncOptionsWithStringEncoding = {
      shell: false,
      cwd,
      timeout: opts.timeout ?? 30_000,
      encoding: 'utf-8',
      env: {
        ...process.env,
        ...(configPathToNodeHome ? { RAD_HOME: configPathToNodeHome } : {}),
        ...opts.env,
      },
    }

    const stdout = execFileSync(
      useEnvStore().resolvedAbsolutePathToRadBinary,
      args,
      spawnOpts,
    ).trim()
    if (opts.shouldLog ?? false) {
      log(stdout, 'info', truncatedRadCmd)
    }

    return { stdout }
  } catch (err) {
    const error = err as Error & {
      status: number // should be non-zero as per the process-return-value convention
      code?: string // set if spawning child process failed: 'ENOENT', 'ETIMEDOUT'
      stdout?: string
      stderr?: string
    }

    console.error(truncatedRadCmd, '\n\n', error)
    if (opts.shouldLog ?? false) {
      log(
        error.stdout?.trim() ||
          error.message.trim() ||
          error.stderr?.trim() ||
          `Failed executing command: ${truncatedRadCmd}`,
        'error',
        truncatedRadCmd,
      )
    }

    // will show up only in the Debug console during development
    return {
      stdout: error.stdout?.trim(),
      stderr: error.stderr?.trim(),
      errorCode: error.code || error.status,
    }
  }
}

function maybeEscapeArg(cliArg: string): string {
  const arg = cliArg
  /**
   * @see https://stackoverflow.com/questions/15783701/which-characters-need-to-be-escaped-when-using-bash/20053121#20053121
   */
  const maybeEscapedArg =
    arg.includes("'") || arg.includes(' ') ? `'${arg.replace(/'/g, "'\\''")}'` : arg

  return maybeEscapedArg
}
