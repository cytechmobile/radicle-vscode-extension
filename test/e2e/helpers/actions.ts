import type { Workbench } from 'wdio-vscode-service'

/** Opens the Radicle view container in the sidebar via the activity bar. */
export async function openRadicleViewContainer(workbench: Workbench) {
  const activityBar = workbench.getActivityBar()
  const radicleViewControl = await activityBar.getViewControl('Radicle')
  await radicleViewControl?.openView()
}
