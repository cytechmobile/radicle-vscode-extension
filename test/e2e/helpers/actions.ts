import type { Workbench } from 'wdio-vscode-service'

/**
 * Opens the Radicle view container in the sidebar, by clicking the radicle button in the
 * activity bar.
 */
export async function openRadicleViewContainer(workbench: Workbench) {
  const activityBar = workbench.getActivityBar()
  await activityBar.wait()

  const radicleViewControl = await activityBar.getViewControl('Radicle')
  await radicleViewControl?.wait()

  await radicleViewControl?.openView()
}

export async function closeRadicleViewContainer(workbench: Workbench) {
  const activityBar = workbench.getActivityBar()
  await activityBar.wait()

  const radicleViewControl = await activityBar.getViewControl('Radicle')
  await radicleViewControl?.wait()

  await radicleViewControl?.closeView()
}
