import * as vscode from 'vscode';
import type { QuickPickItem } from 'vscode';
import { exec, getConfigPathToRadBinary, log, setConfigPathToRadBinary } from '.';

/**
 * Resolves a reference to Radicle CLI to be used for executing shell commands.
 *
 * @returns Either the path to the `rad` binary defined manually by the user via
 * config, or otherwise just the string `"rad"`.
 */
export function getRadCliRef(): string {
  const radCliRef = getConfigPathToRadBinary() || 'rad';

  return radCliRef;
}

/**
 * Returns the absolute path to the _resolved_ rad CLI binary.
 *
 * @returns The path to the rad binary, if successfully resolved.
 */
export async function getRadCliPath(): Promise<string | undefined> {
  let radCliPath;

  if (await isRadCliInstalled()){
    radCliPath = (getConfigPathToRadBinary() || await exec('which rad', {
      shouldLog: false,
    }))?.trim();
  }

  return radCliPath;
}

/**
 * Gets the version of the resolved rad CLI binary.
 *
 * @returns The version of the rad cli, if successfully resolved.
 */
export async function getRadCliVersion(): Promise<string | undefined> {
  const version = (await exec(`${getRadCliRef()} --version`, { shouldLog: false }))?.trim();

  return version;
}

/**
 * Answers whether the rad CLI is installed and resolveable on the host OS.
 *
 * @returns `true` if found, otherwise `false`.
 */
export async function isRadCliInstalled(): Promise<boolean> {
  const isInstalled = Boolean(await getRadCliVersion());

  return isInstalled;
}

/**
 * Checks if the CLI is accessible to the extension. If not the user will be informed
 * of the error and offered to troubleshoot.
 *
 * @param options - Optional configuration.
 */
export async function validateRadCliInstallation(options?: {
  notifyUserOnSuccess?: boolean,
}): Promise<void> {
  const opts = options ?? {};

  if (await isRadCliInstalled()) {
    const msg = `Using rad CLI "${await getRadCliVersion()}" from "${await getRadCliPath()}".`;

    log(msg, 'info');
    opts.notifyUserOnSuccess && vscode.window.showInformationMessage(msg);

    return;
  }

  const msg = `Failed resolving rad CLI binary. Tried invoking it in the shell as "${
    getRadCliRef()
  }".`;
  log(msg, 'error');

  const btnResolve = 'Resolve';
  const warnMsgSelection = await vscode.window.showWarningMessage(
    "Failed resolving `rad` CLI. Please ensure it is installed on your machine and either that it is globally accessible in the shell or that its path is correctly defined in the extension's configuration. Expect most of the extention's capabilities to remain severely reduced until this issue is resolved.",
    btnResolve,
  );

  if (warnMsgSelection !== btnResolve) {
    return;
  }

  const title = 'Radicle CLI Installation Troubleshooter';
  const no = "No, I haven't";
  const yes = 'Yes, I have';
  const cliInstalledSelection = await vscode.window.showQuickPick([
    {
      label: no,
      detail: '$(link-external) Opens the Getting Started guide in your browser',
    },
    {
      label: yes,
      detail: "$(settings-gear) Let's you manually set the path to the `rad` binary",
    },
  ] satisfies QuickPickItem[], {
    title,
    placeHolder: 'Have you already installed the Radicle `rad` CLI on your machine?',
    ignoreFocusOut: true,
  });

  if (cliInstalledSelection?.label === no) {
    vscode.env.openExternal(vscode.Uri.parse('https://radicle.xyz/get-started.html'));
    return;
  }

  if (cliInstalledSelection?.label !== yes) {
    return;
  }

  const filePicker = '$(folder-opened) Browse filesystem using file picker';
  const inputBox = '$(edit) Type path in input box';
  const pathSetMethodSelection = await vscode.window.showQuickPick([filePicker, inputBox], {
    title,
    placeHolder: 'How do you prefer to set the path to the `rad` binary?',
    ignoreFocusOut: true,
  });

  if (pathSetMethodSelection === filePicker) {
    const fileUriSelection = (await vscode.window.showOpenDialog({
      title,
      openLabel: 'Select',
      canSelectMany: false,
    }))?.[0];

    fileUriSelection && setConfigPathToRadBinary(fileUriSelection.path);
  }

  if (pathSetMethodSelection === inputBox) {
    const typedInPath = (await vscode.window.showInputBox({
      title,
      prompt: 'Please type-in the absolute path to the rad CLI executable binary stored on your machine. You can change this again in the settings.',
      value: getConfigPathToRadBinary(),
      placeHolder: 'For example: /usr/bin/rad',
      validateInput: async (input) => {
        const isPathToRadCli = Boolean(await exec(`${input.trim()} --version`));

        return isPathToRadCli
          ? undefined
          : 'Input must be a valid path to a Radicle `rad` CLI binary!';
      },
      ignoreFocusOut: true,
    }))?.trim();

    typedInPath && setConfigPathToRadBinary(typedInPath);
  }
}
