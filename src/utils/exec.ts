import { exec as execNative } from 'child_process';
import * as vscode from 'vscode';

function getWorkspaceDir(): string {
  const dir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!dir) {
    throw 'Failed resolving path of workspace directory.';
  }

  return dir;
}

function execBase(cmd: string): Promise<string> {
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
 * exec('echo "hello shell :)"');
 * ```
 *
 * @param {string} cmd - The shell command to execute.
 * @param {object} options - Optional configuration.
 */
export async function exec(
  cmd: string,
  options: {
    execInWorkspaceDir?: boolean
    shouldLog?:boolean,
  } = {
    execInWorkspaceDir: true,
    shouldLog: true,
  }): Promise<void> {
  try {
    const finalCmd = options.execInWorkspaceDir
      ? `cd "${getWorkspaceDir()}" && ${cmd}`
      : cmd;

    const stdOut = await execBase(finalCmd);

    options.shouldLog && vscode.window.showInformationMessage(stdOut);
  } catch (error) {
    const parsedError = typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : `Failed executing shell command: "${cmd}"`;

    if (options.shouldLog) {
      vscode.window.showErrorMessage(parsedError);
    } else {
      console.error(parsedError);
    }
  }
}
