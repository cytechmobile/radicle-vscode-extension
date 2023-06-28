import { sep } from 'node:path'
import { type QuickPickItem, Uri, commands, window } from 'vscode'
import { fetchRadicleProjects, getRadCliRef } from '../helpers'
import { exec, getRepoRoot, showLog } from '../utils'

export async function selectAndCloneRadicleProject(): Promise<void> {
  const projects = await fetchRadicleProjects({
    onError: (requestUrl) => {
      window.showErrorMessage(
        `Failed establishing connection with Radicle HTTP API at "${requestUrl}". \
        Please ensure that "radicle-httpd" is already running and the address to the API's \
        root endpoint is correctly set in the extension's settings.`,
      )
    },
  })
  if (!projects) {
    return
  }

  const qPickItems: QuickPickItem[] = projects.map((proj) => ({
    label: proj.name,
    description: `${proj.trackings ? `$(radio-tower) ${proj.trackings} | ` : ''}${proj.id}`,
    detail: proj.description,
    icon: 'repo',
  }))

  const projSelection = await window.showQuickPick(qPickItems, {
    placeHolder: 'Choose a Radicle project to clone locally',
    ignoreFocusOut: true,
    matchOnDescription: true,
    matchOnDetail: true,
  })
  if (!projSelection?.label) {
    return
  }

  const selectedRid = projects.find((proj) => proj.name === projSelection.label)?.id
  if (!selectedRid) {
    return
  }

  const repoRoot = getRepoRoot()
  const oneFolderUpFromRepoRoot = repoRoot?.split(sep).slice(0, -1).join(sep)
  const cloneTargetDir = (
    await window.showOpenDialog({
      title: `Choose a folder to clone ${projSelection.label} into`,
      openLabel: 'Select as Destination',
      canSelectMany: false,
      canSelectFiles: false,
      canSelectFolders: true,
      defaultUri: oneFolderUpFromRepoRoot ? Uri.file(oneFolderUpFromRepoRoot) : undefined,
    })
  )?.[0]
  if (!cloneTargetDir) {
    return
  }

  const msgSuffix = `project "${projSelection.label}" with Radicle ID (RID) "${selectedRid}" into "${cloneTargetDir.fsPath}"`
  const didClone = exec(`${getRadCliRef()} clone ${selectedRid} --no-confirm`, {
    cwd: cloneTargetDir.fsPath,
    timeout: 60_000,
    shouldLog: true,
  })
  if (!didClone) {
    const buttonOutput = 'Show output'
    const shouldShowOutput = await window.showErrorMessage(
      `Failed cloning ${msgSuffix}`,
      buttonOutput,
    )

    shouldShowOutput && showLog()

    return
  }

  const buttonOpenInVscode = 'Open in new window'
  const shouldOpenInNewWindow = await window.showInformationMessage(
    `Cloned project ${msgSuffix}`,
    buttonOpenInVscode,
  )
  shouldOpenInNewWindow &&
    commands.executeCommand(
      'vscode.openFolder',
      Uri.file(`${cloneTargetDir.fsPath}${sep}${projSelection.label}`),
      { forceNewWindow: true },
    )
}
