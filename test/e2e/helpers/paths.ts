import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { httpdPort } from '../constants'

/** The disposable `$HOME` for a single worker, isolated from every other worker's. */
export function getWorkerHomePath(workerIndex: number): string {
  return join(tmpdir(), `rad-e2e-home-${workerIndex}`)
}

export function getWorkerNodeHomePath(workerIndex: number): string {
  return join(getWorkerHomePath(workerIndex), '.radicle')
}

export function getWorkerRadicleBinPath(workerIndex: number): string {
  return join(getWorkerNodeHomePath(workerIndex), 'bin')
}

/** The disposable workspace a single worker's VS Code opens, isolated from every other's. */
export function getWorkerWorkspacePath(workerIndex: number): string {
  return join(tmpdir(), `rad-e2e-workspace-${workerIndex}`)
}

/**
 * The httpd port a network-mutating worker (e.g. the clone spec) runs its own httpd on, kept
 * off the shared httpd's `httpdPort` so the two never clash.
 */
export function getWorkerHttpdPort(workerIndex: number): number {
  return httpdPort + 1 + workerIndex
}

export function getWorkerNodePidFilePath(workerIndex: number): string {
  return join(getWorkerHomePath(workerIndex), 'radicle-node.pid')
}

export function getWorkerHttpdPidFilePath(workerIndex: number): string {
  return join(getWorkerHomePath(workerIndex), 'radicle-httpd.pid')
}
