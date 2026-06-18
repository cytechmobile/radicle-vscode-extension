# E2E Tests

End-to-end tests for the Radicle VS Code extension, using [WebdriverIO](https://webdriver.io/) with [wdio-vscode-service](https://github.com/webdriverio-community/wdio-vscode-service).

## Running

```sh
pnpm test:e2e
```

No other setup needed, beyond having `curl`, `tar`, and `unzip` on `PATH`. The first run downloads Radicle and a chromedriver matching VS Code's bundled Chromium into a throwaway sandbox and cache; subsequent runs reuse them in a freshly wiped state. Specs run in parallel, one worker per spec, each in its own isolated slice of the sandbox, so specs can exercise any behavior without worrying about isolation or about each other.

## The Test Sandbox

Every run provisions a self-contained Radicle environment and wipes it on completion. Specs run in parallel, one worker per spec, and each worker gets its own disposable slice, all kept off our real state:

- A **shared template home** in the OS temp dir (`os.tmpdir()/radicle-vscode-extension-e2e-home/`), built once before any spec runs. It holds the installed Radicle CLI, node, and httpd, the test identity, and the node config. The node and httpd run here, on a fixed port, for the whole run.
- A **per-worker `$HOME`** (`.../radicle-vscode-extension-e2e-home-N/`), copied from the template (its `bin`, `config.json`, and keys, but not the running node's live state). The whole directory is used as that worker's `$HOME`, so `os.homedir()` inside the worker's processes resolves it and no read or write ever reaches our computer's real `~/.radicle`.
- A **per-worker workspace** (`.../radicle-vscode-extension-e2e-workspace-N/`), which that worker's VS Code opens as the project under test. It is kept outside this repo on purpose (see [Known gotchas](#known-gotchas)).

Every part lives in the OS temp dir and is wiped at the start of the next run, so nothing persists across runs or reboots.

```
$TMPDIR/
  radicle-vscode-extension-e2e-home/          <-- shared template; runs the node + httpd
    .radicle/
      bin/
        rad                                   <-- installed Radicle CLI
        radicle-node                          <-- installed Radicle node
        radicle-httpd                         <-- installed httpd
      config.json                             <-- node config
      keys/                                   <-- test identity (radicle, radicle.pub)
    radicle-node.pid                          <-- PID of the running node (for post-crash teardown)
    radicle-httpd.pid                         <-- PID of the running httpd
    radicle-node.log                          <-- node daemon output
    radicle-httpd.log                         <-- httpd daemon output
  radicle-vscode-extension-e2e-home-0/        <-- worker 0's $HOME (copied from the template)
    .radicle/
      bin/  config.json  keys/
  radicle-vscode-extension-e2e-workspace-0/   <-- worker 0's workspace (project under test)
  ...                                         <-- one home-N and workspace-N per worker
```

The chromedriver that drives VS Code is downloaded once into `node_modules/.cache/chromedriver/` and reused across runs.

## Adding a spec

- Register the file in `e2eSpecs` in `wdio.conf.ts`. That gives it a worker with its own `$HOME` and workspace, and it runs concurrently with the others. No glob is used on purpose, so each spec's sandbox needs stay explicit.
- Read the worker's own paths from the injected env, not the shared constants: `RAD_E2E_WORKSPACE` for the workspace and `RAD_E2E_NODE_HOME` for the node home.
- Keep it self-contained and order-independent. Workers run in parallel, so a spec must not depend on another's state.
- If it sets `radicle.advanced.pathToNodeHome`, point it inside the worker's sandbox (`RAD_E2E_NODE_HOME`), never our real home.
- If it mutates the network (clone, sync, push, or patches over httpd), it needs its own node + httpd on a per-worker port, which is not built yet (see [Known gotchas](#known-gotchas)). Until then, keep to read-only httpd access.

## Philosophy

### Goals

- Full suite runnable locally with zero manual setup, using the same harness for both local and CI runs.
- Ready-to-use, isolated Radicle setup (CLI + node + httpd + identity + config) enabling focused and thorough testing.

### Hard constraints

Never read, write, or mutate any real state on the machine running the tests (`~/.radicle`, `~/.gitconfig`, shell profile, ssh-agent, running node/httpd). No permanent side effects even on crash. Abort before any spec runs if provisioning fails.

### Known gotchas

- **Workspace location:** each worker's workspace lives in the OS temp dir, not in this repo. Otherwise Git and `rad` would walk up from the workspace and detect the repo's own git- and rad-initialized state, confusing the conditionals that select which view to render.
- **`pathToNodeHome` reactivity:** when a spec sets `radicle.advanced.pathToNodeHome`, the extension injects `RAD_HOME` into its Radicle CLI calls, which overrides the `HOME`-based isolation for those calls. Such a spec must point the setting at a path inside the test sandbox, never the real home.
- **Parallelism:** each spec runs in its own worker, in parallel, via one capability per spec (registered in `e2eSpecs` in `wdio.conf.ts`; add a new spec there rather than using a glob, so its sandbox needs stay explicit). `beforeSession` gives the worker its own emulated `$HOME` (copied from the template built once in `onPrepare`) and its own workspace, injects the per-worker env, and `afterSession` disposes them. The workspace is pinned per capability through `wdio:vscodeOptions.workspacePath`, not set in a hook: the service reads `workspacePath` when it launches VS Code, before `beforeSession` runs, and the launcher shares one capability object across workers so a value set in `onWorkerStart` gets clobbered. The node and httpd stay shared on a fixed port, since the current suites only connect to read. A network-mutating suite (clone, sync, patches over httpd) would need its own node + httpd on a per-worker port, with `radicle.advanced.httpApiEndpoint` set per worker; that step is deferred until such a suite lands.
- **macOS shell-env resolution:** VS Code can re-resolve the shell environment on launch; the pre-flight assertion catches any resulting `HOME`/`PATH` drift.
- **Windows is unsupported**, and Linux is x64 only, since Chrome for Testing publishes no Linux arm64 chromedriver (the CI matrix is macOS + Linux).

## Environment Variables

| Variable                | Default    | Purpose                                                          |
| ----------------------- | ---------- | ---------------------------------------------------------------- |
| `RADICLE_VERSION`       | _(latest)_ | Pin the Radicle CLI/node version.                                |
| `RADICLE_HTTPD_VERSION` | _(latest)_ | Pin the `radicle-httpd` version.                                 |
| `RECORD_VIDEO`          | _(unset)_  | Record a video of each failed spec. Always on under CI (`CI=1`). |

## Debugging

### Daemon logs

The node and httpd daemons write to `radicle-node.log` and `radicle-httpd.log` inside the shared template home (see [The Test Sandbox](#the-test-sandbox)). Tail them during a run to diagnose startup or connection issues:

```sh
tail -f $TMPDIR/radicle-vscode-extension-e2e-home/radicle-node.log $TMPDIR/radicle-vscode-extension-e2e-home/radicle-httpd.log
```

### WebdriverIO logs

wdio prints its driver and session output to the terminal. Increase `logLevel` to `'debug'` in `wdio.conf.ts` for verbose output. The mocha spec reporter prints a full failure trace inline, including the offending assertion and stack.
