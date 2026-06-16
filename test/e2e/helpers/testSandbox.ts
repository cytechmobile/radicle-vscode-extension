import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import { delimiter, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { browser } from '@wdio/globals'
import { $ } from 'zx'
import {
  backupRadCliPath,
  emulatedHomePath,
  httpdHost,
  httpdPath,
  httpdPidFilePath,
  httpdPort,
  httpdVersion,
  nodeHomePath,
  nodePidFilePath,
  radCliPath,
  radCliVersion,
  radicleBinPath,
  resolveReleaseTargetTriple,
  testingWorkspacePath,
} from '../constants/config'

function spawnDaemon(
  command: string,
  args: string[],
  { pidFilePath, logFilePath }: { pidFilePath: string; logFilePath: string },
): void {
  const logFd = fs.openSync(logFilePath, 'a')
  // `detached: true` + `child.unref()` lets the daemon outlive accidental parent
  // exits AND lets us signal its whole process group via a negative PID later.
  const child = spawn(command, args, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  })
  if (child.pid) {
    fs.writeFileSync(pidFilePath, String(child.pid))
  }
  child.unref()
}

/** Whether `pid` is a live process that was launched from inside the test sandbox. */
function isSandboxProcess(pid: number): boolean {
  try {
    // `ps -o args=` (POSIX) prints a process's command line. Our daemons were launched
    // from a binary inside emulatedHomePath, so a recycled or unrelated PID won't match.
    const commandLine = execFileSync('ps', ['-p', String(pid), '-o', 'args='], {
      encoding: 'utf-8',
    })

    return commandLine.includes(emulatedHomePath)
  } catch {
    return false
  }
}

function killByPidFile(pidFilePath: string): void {
  if (!fs.existsSync(pidFilePath)) {
    return
  }
  const pid = Number(fs.readFileSync(pidFilePath, 'utf-8').trim())
  // Only signal a PID we can confirm is still one of our sandbox daemons. A stale pidfile
  // (left by a crashed run) may reference a PID the OS has since recycled for an unrelated
  // process, and killing that process (or its whole group) could disrupt the user's machine.
  if (Number.isInteger(pid) && pid > 0 && isSandboxProcess(pid)) {
    // Negative PID targets the whole process group created via `detached: true`.
    for (const target of [-pid, pid]) {
      try {
        process.kill(target, 'SIGTERM')
      } catch {
        /* already gone */
      }
    }
  }

  try {
    fs.rmSync(pidFilePath)
  } catch {
    /* ignore */
  }
}

/** Removes the disposable workspace folder that specs git- and rad-initialize. */
function resetTestingWorkspace(): void {
  fs.rmSync(testingWorkspacePath, { recursive: true, force: true })
}

async function assertPortIsFree(host: string, port: number): Promise<void> {
  await new Promise<void>((res, rej) => {
    const server = net
      .createServer()
      .once('error', (err: NodeJS.ErrnoException) =>
        rej(
          new Error(
            `Port ${host}:${port} is already in use (${err.code}). ` +
              `This is the extension's default httpd endpoint, so stop the process using it ` +
              `(e.g. a locally running radicle-httpd) before running the e2e suite.`,
          ),
        ),
      )
      .once('listening', () => server.close(() => res()))
    server.listen(port, host)
  })
}

async function waitUntil(
  predicate: () => Promise<boolean>,
  { timeoutMs, label }: { timeoutMs: number; label: string },
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) {
      return
    }
    await sleep(500)
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label}`)
}

async function installRadCli(): Promise<void> {
  const target = resolveReleaseTargetTriple()
  const version = radCliVersion ?? 'latest'
  const url = `https://files.radicle.dev/releases/${version}/radicle-${target}.tar.xz`
  const tarballPath = join(emulatedHomePath, 'radicle.tar.xz')

  await $`curl -sSLf -o ${tarballPath} ${url}`
  // Extract the release tarball ourselves rather than piping radicle.dev/install to a shell:
  // that installer's unquoted `mkdir -p $PREFIX` corrupts paths containing spaces.
  await $`tar -xJf ${tarballPath} --strip-components=1 -C ${nodeHomePath}`
  await $`chmod -R +x ${radicleBinPath}`
  await $`rm -f ${tarballPath}`

  if (!fs.existsSync(radCliPath)) {
    throw new Error(`Radicle CLI was not installed at the expected path: ${radCliPath}`)
  }
}

async function installHttpd(): Promise<void> {
  const target = resolveReleaseTargetTriple()
  // The `latest` directory omits the version from the filename; versioned dirs include it.
  const isLatest = httpdVersion === 'latest'
  const fileName = isLatest
    ? `radicle-httpd-${target}.tar.xz`
    : `radicle-httpd-${httpdVersion}-${target}.tar.xz`
  const url = `https://files.radicle.dev/releases/radicle-httpd/${httpdVersion}/${fileName}`
  const tarballPath = join(emulatedHomePath, 'radicle-httpd.tar.xz')

  await $`curl -sSLf -o ${tarballPath} ${url}`
  // Extract into the node home (matching the CLI layout) so the binary lands at httpdPath.
  await $`tar -xJf ${tarballPath} --strip-components=1 -C ${nodeHomePath}`
  await $`chmod +x ${httpdPath}`
  await $`rm -f ${tarballPath}`

  if (!fs.existsSync(httpdPath)) {
    throw new Error(`httpd was not installed at the expected path: ${httpdPath}`)
  }
}

async function createRadicleIdentity(): Promise<void> {
  // RAD_PASSPHRASE='' (set in wdio.conf.ts) yields an unencrypted key, usable without an ssh-agent.
  await $`rad auth --alias test_user`
}

/**
 * Configures the node for the isolated `test` network: no seeds, no peers, no TCP listener,
 * so it can neither reach nor be reached by the real network, nor clash with a node the
 * user may already run.
 */
function configureNodeForTesting(): void {
  const configPath = join(nodeHomePath, 'config.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
    preferredSeeds?: unknown[]
    node?: Record<string, unknown>
  }

  config.preferredSeeds = []
  config.node = {
    ...config.node,
    network: 'test',
    connect: [],
    externalAddresses: [],
    listen: [],
    peers: { type: 'static' },
  }

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
}

async function startDaemons(): Promise<void> {
  // `--foreground` keeps the node attached to the child we spawn, so we can
  // SIGTERM it by PID even when `rad node stop` is unavailable (e.g. while the
  // Radicle CLI binary is moved aside for the "uninstalled" emulation).
  spawnDaemon(radCliPath, ['node', 'start', '--foreground'], {
    pidFilePath: nodePidFilePath,
    logFilePath: join(emulatedHomePath, 'radicle-node.log'),
  })
  await waitUntil(
    async () => {
      try {
        await $`rad node status`.timeout('5s')

        return true
      } catch {
        return false
      }
    },
    { timeoutMs: 30_000, label: 'the Radicle node to report running' },
  )

  await assertPortIsFree(httpdHost, httpdPort)
  spawnDaemon(httpdPath, ['--listen', `${httpdHost}:${httpdPort}`], {
    pidFilePath: httpdPidFilePath,
    logFilePath: join(emulatedHomePath, 'radicle-httpd.log'),
  })
  await waitUntil(
    async () =>
      await new Promise<boolean>((res) => {
        const socket = net
          .connect({ host: httpdHost, port: httpdPort })
          .once('connect', () => {
            socket.destroy()
            res(true)
          })
          .once('error', () => {
            socket.destroy()
            res(false)
          })
      }),
    { timeoutMs: 30_000, label: `httpd to listen on ${httpdHost}:${httpdPort}` },
  )
}

/** Idempotent, never throws. Safe to call from setup, signal handlers, and onComplete. */
export async function teardownTestSandbox(): Promise<void> {
  try {
    await $`rad node stop`.timeout('10s')
  } catch {
    /* ignore */
  }
  killByPidFile(nodePidFilePath)
  killByPidFile(httpdPidFilePath)

  try {
    fs.rmSync(emulatedHomePath, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  resetTestingWorkspace()
}

/**
 * Provisions the test sandbox, clearing any leftover state from a previous run first. On
 * failure, cleans up and rethrows so no partial sandbox is left behind.
 */
export async function setupTestSandbox(): Promise<void> {
  try {
    await teardownTestSandbox()
    await $`mkdir -p ${nodeHomePath}`
    await $`mkdir -p ${testingWorkspacePath}`
    await installRadCli()
    await installHttpd()
    await createRadicleIdentity()
    configureNodeForTesting()
    await startDaemons()
  } catch (error) {
    await teardownTestSandbox()
    throw error
  }
}

const radCliUninstalledStub =
  '#!/bin/sh\n# e2e test stub: emulates an unresolvable Radicle CLI by failing with no output.\nexit 1\n'

/**
 * Makes the Radicle CLI appear unresolvable to the extension, emulating a "not installed"
 * state. Call `emulateRadCliInstalled` to restore.
 */
export async function emulateRadCliUninstalled(): Promise<void> {
  // A stub that resolves-but-fails (rather than a missing binary) is needed: otherwise the
  // extension's `which rad` lookup would find a real `rad` elsewhere on the user's PATH.
  await $`mv ${radCliPath} ${backupRadCliPath}`
  fs.writeFileSync(radCliPath, radCliUninstalledStub, { mode: 0o755 })
}

/** Restores the Radicle CLI after a call to `emulateRadCliUninstalled`. */
export async function emulateRadCliInstalled(): Promise<void> {
  fs.rmSync(radCliPath, { force: true })
  await $`mv ${backupRadCliPath} ${radCliPath}`
}

/**
 * To be run once per session before any spec. Throws if the extension host's `HOME` or
 * `PATH` do not reflect the test sandbox, aborting the run before any spec can touch
 * real Radicle state.
 */
export async function assertExtensionResolvedTestSandbox(): Promise<void> {
  const extHostEnv = await browser.executeWorkbench(() => ({
    home: process.env['HOME'],
    userProfile: process.env['USERPROFILE'],
    radHome: process.env['RAD_HOME'],
    path: process.env['PATH'],
  }))

  const resolvedHome = extHostEnv.home ?? extHostEnv.userProfile
  if (!resolvedHome || !resolve(resolvedHome).startsWith(resolve(emulatedHomePath))) {
    throw new Error(
      `Extension host HOME ("${resolvedHome ?? 'unset'}") is not the emulated home ` +
        `("${emulatedHomePath}"). Aborting to avoid touching the real Radicle home.`,
    )
  }
  if (extHostEnv.radHome) {
    throw new Error(
      `Extension host has RAD_HOME set ("${extHostEnv.radHome}"); it must be unset so the ` +
        `default $HOME/.radicle path is exercised.`,
    )
  }
  if (!extHostEnv.path?.split(delimiter).includes(radicleBinPath)) {
    throw new Error(
      `Extension host PATH does not contain the emulated bin dir ("${radicleBinPath}"); ` +
        `\`which rad\` would not resolve to the emulated Radicle CLI. Aborting.`,
    )
  }
}
