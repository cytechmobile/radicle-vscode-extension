import { sep } from 'node:path'
import { ProgressLocation, type QuickPickItem, Uri, commands, window } from 'vscode'
import { fetchFromHttpd, getRadCliRef } from '../helpers'
import { exec, getRepoRoot, log, showLog } from '../utils'
import { notifyUserAboutFetchError } from './httpdConnection'
import { launchAuthenticationFlow } from './radicleIdentityAuth'

export async function selectAndCloneRadicleRepo(): Promise<void> {
  if (!(await launchAuthenticationFlow())) {
    const msg = 'Cannot clone without an authenticated Radicle identity.'
    log(msg, 'error')
    window.showErrorMessage(msg)

    return
  }

  const { data: repos, error } = await window.withProgress(
    {
      location: ProgressLocation.Window,
      title: `‎$(radicle-logo) Fetching list of repos available for cloning…`,
    },
    async () => {
      return await fetchFromHttpd('/projects', {
        query: { show: 'all' },
      })
    },
  )
  if (!repos) {
    notifyUserAboutFetchError(error)

    return
  }

  const qPickItems: QuickPickItem[] = repos
    .sort((p1, p2) => p2.seeding - p1.seeding)
    .map((proj) => ({
      label: proj.name,
      description: `$(radio-tower) ${proj.seeding} | ${proj.id}`,
      detail: proj.description,
      icon: 'repo',
    }))

  const projSelection = await window.showQuickPick(qPickItems, {
    placeHolder: 'Choose a Radicle repo to clone locally',
    ignoreFocusOut: true,
    matchOnDescription: true,
    matchOnDetail: true,
  })
  if (!projSelection?.label) {
    return
  }

  const selectedRid = repos.find((proj) => proj.name === projSelection.label)?.id
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

  const msgSuffix = `repo "${projSelection.label}" with id "${selectedRid}" into "${cloneTargetDir.fsPath}"`
  const didClone = await window.withProgress(
    {
      location: ProgressLocation.Window,
      title: `‎$(radicle-logo) Cloning ${msgSuffix}…`,
    },
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    async () => {
      return exec(`${getRadCliRef()} clone ${selectedRid} --no-confirm`, {
        cwd: cloneTargetDir.fsPath,
        timeout: 120_000,
        shouldLog: true,
      })
    },
  )
  if (!didClone) {
    const msg = `Failed cloning ${msgSuffix}`
    log(msg, 'error')

    const buttonOutput = 'Show output'
    const shouldShowOutput = await window.showErrorMessage(msg, buttonOutput)
    shouldShowOutput && showLog()

    return
  }

  const msg = `Cloned ${msgSuffix}`
  log(msg, 'info')

  const buttonOpenInVscode = 'Open in new window'
  const shouldOpenInNewWindow = await window.showInformationMessage(msg, buttonOpenInVscode)
  shouldOpenInNewWindow &&
    commands.executeCommand(
      'vscode.openFolder',
      Uri.file(`${cloneTargetDir.fsPath}${sep}${projSelection.label}`),
      { forceNewWindow: true },
    )
}
