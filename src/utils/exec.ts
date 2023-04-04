import { exec as execNative } from 'child_process';
import { getWorkspaceFolderPaths, log } from '.';

function execNativePromisified(cmd: string): Promise<string> {
  return new Promise((resolve, reject) =>
    execNative(
      cmd,
      (_, stdOut, stdErr) => stdErr ? reject(stdErr): resolve(stdOut),
    )
  );
}


/**
 * Executes a shell command and returns a promise that resolves with the stdout of the
 * command or rejects with the stderr output.
 *
 * EXAMPLE:
 * ```ts
 * exec('echo "hello shell :)"')
 * ```
 *
 * @param cmd - The shell command to execute. Can be a static or a function resolving
 * the command dynamically.
 * @param options - Optional configuration.
 * @returns The output of the shell command if successful, otherwise nothing.
 */
export async function exec(
  cmd: string | (() => string),
  options?: {
    shouldLog?:boolean,  // TODO: maninak refactor to false by default
    onSuccess?: (ctx: { cmd: string, stdOut: string }) => void,
    onError?: (ctx: { cmd: string, parsedError: string }) => void,
  }): Promise<string | undefined> {
  const opts = options ?? {};
  const resolvedCmd = typeof cmd === "function" ? cmd() : cmd;

  try {
    const firstWorkspaceDir = getWorkspaceFolderPaths()?.[0]; // Hack: always use only 0th folder
    if (!firstWorkspaceDir) {
      throw `Failed resolving path of workspace directory in order to exec "${
        resolvedCmd
      }" in it.`;
    }

    const cmdToExec = `cd "${firstWorkspaceDir}" && ${resolvedCmd}`;

    const stdOut = await execNativePromisified(cmdToExec);

    if (opts.shouldLog ?? true) {
      log(stdOut, 'info', resolvedCmd);
    }

    opts.onSuccess?.({ cmd: resolvedCmd, stdOut});

    return stdOut;
  } catch (error) {
    const parsedError = typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : `Failed executing shell command: "${resolvedCmd}"`;

    if (opts.shouldLog ?? true) {
      log(parsedError, 'error', resolvedCmd);
    } else {
      // will show up in the Debug console during development
      console.error(parsedError);
    }

    opts.onError?.({ cmd: resolvedCmd, parsedError });

    return undefined;
  }
}
