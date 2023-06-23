import { sep } from 'node:path'
import { type QuickPickItem, Uri, commands, window } from 'vscode'
import { fetch } from 'undici'
import { getConfig, getRadCliRef } from '../helpers'
import { exec, getRepoRoot, log, showLog } from '../utils'

interface RadicleProject {
  id: string
  name: string
  description: string
  trackings?: number
}

async function fetchRadicleProjects(options?: {
  onError?: (apiProjectsUrl: string) => unknown
}): Promise<RadicleProject[] | undefined> {
  const apiRoot = getConfig('radicle.advanced.httpApiEndpoint')
  if (!apiRoot) {
    throw new Error('No endpoint to the Radicle HTTP API is set')
  }
  const apiProjects = `${apiRoot}/projects`

  try {
    const projects = (await (await fetch(apiProjects)).json()) as RadicleProject[]

    return projects
  } catch (error) {
    const errorMsg =
      typeof error === 'string'
        ? error
        : error instanceof Error
        ? error.message
        : `Failed fetching Radicle projects`

    log(errorMsg, 'error', `Fetching "${apiProjects}"...`)
    options?.onError?.(apiProjects)

    return undefined
  }
}

export async function selectAndCloneRadicleProject(): Promise<void> {
  const projects = await fetchRadicleProjects({
    onError: (endpoint) => {
      window.showErrorMessage(
        `Failed establishing connection with Radicle HTTP API at "${endpoint}". \
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
