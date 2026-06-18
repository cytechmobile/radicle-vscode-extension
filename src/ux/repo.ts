import { sep } from 'node:path'
import { commands, ProgressLocation, type QuickPickItem, Uri, window } from 'vscode'
import { execRad, fetchFromHttpd } from '../helpers'
import { getRepoRoot, log, showLog } from '../utils'
import { notifyUserAboutFetchError } from './httpdConnection'

export async function pickAndCloneRadicleRepo(): Promise<void> {
  const { data: repos, error } = await window.withProgress(
    {
      location: ProgressLocation.Window,
      title: `‎$(radicle-logo) Fetching list of repos available for cloning…`,
    },
    async () => await fetchFromHttpd('/repos', { query: { show: 'all' } }),
  )
  if (!repos) {
    notifyUserAboutFetchError(error)

    return
  }

  // eslint-disable-next-line prettier/prettier
  interface RepoQuickPickItem extends QuickPickItem { rid: string }
  const qPickItems: RepoQuickPickItem[] = repos
    .sort((p1, p2) => p2.seeding - p1.seeding)
    .flatMap((repo) => {
      const project = repo.payloads['xyz.radicle.project']?.data
      if (!project) {
        return []
      }

      const qPickItem: RepoQuickPickItem = {
        label: project.name,
        description: `$(radio-tower) ${repo.seeding} | ${repo.rid}`,
        detail: project.description,
        rid: repo.rid,
      }

      return qPickItem
    })

  const repoSelection = await window.showQuickPick(qPickItems, {
    placeHolder: 'Choose a Radicle repo to clone locally',
    ignoreFocusOut: true,
    matchOnDescription: true,
    matchOnDetail: true,
  })
  if (!repoSelection) {
    return
  }

  const selectedRid = repoSelection.rid

  const repoRoot = getRepoRoot()
  const oneFolderUpFromRepoRoot = repoRoot?.split(sep).slice(0, -1).join(sep)
  const cloneTargetDir = (
    await window.showOpenDialog({
      title: `Choose a folder to clone ${repoSelection.label} into`,
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

  const msgSuffix = `repo "${repoSelection.label}" with id "${selectedRid}" into "${cloneTargetDir.fsPath}"`
  const didClone = await window.withProgress(
    {
      location: ProgressLocation.Window,
      title: `‎$(radicle-logo) Cloning ${msgSuffix}…`,
    },
    // eslint-disable-next-line require-await
    async () => {
      // TODO: maninak make rad clone non-blocking
      const { errorCode } = execRad(['clone', selectedRid, '--no-confirm'], {
        cwd: cloneTargetDir.fsPath,
        timeout: 120_000,
        shouldLog: true,
      })

      return !errorCode
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
      Uri.file(`${cloneTargetDir.fsPath}${sep}${repoSelection.label}`),
      { forceNewWindow: true },
    )
}
