# E2E Tests

End-to-end tests for the Radicle VS Code extension, using [WebdriverIO](https://webdriver.io/) with [wdio-vscode-service](https://github.com/webdriverio-community/wdio-vscode-service).

## Running

```sh
pnpm test:e2e
```

No other setup needed, beyond having `curl`, `tar`, and `unzip` on `PATH`. The first run downloads Radicle and a chromedriver matching VS Code's bundled Chromium into a throwaway sandbox and cache; subsequent runs reuse them in a freshly wiped state. The extension always operates on the test sandbox, so specs can exercise any behavior without worrying about isolation.

## The Test Sandbox

Every run provisions a self-contained Radicle environment and wipes it on completion. It has two disposable parts, both kept off our real state:

- An **emulated `$HOME`** in the OS temp dir (`os.tmpdir()/radicle-vscode-extension-e2e-home/`). The whole directory is used as `$HOME`, so `os.homedir()` inside every process in the run resolves the same emulated home, and no read or write ever reaches our computer's real `~/.radicle`. It is wiped at the start of every run, so nothing persists across runs or reboots.
- A **testing workspace** in the OS temp dir, which VS Code opens as the project under test. It is kept outside this repo on purpose (see [Known gotchas](#known-gotchas)).

```
$TMPDIR/radicle-vscode-extension-e2e-home/
  .radicle/           ← emulated $HOME/.radicle
    bin/
      rad             ← installed Radicle CLI
      radicle-node    ← installed Radicle node
      radicle-httpd   ← installed httpd
  radicle-node.pid    ← PID of the running node (for post-crash teardown)
  radicle-httpd.pid   ← PID of the running httpd
  radicle-node.log    ← node daemon output
  radicle-httpd.log   ← httpd daemon output
```

The chromedriver that drives VS Code is downloaded once into `node_modules/.cache/chromedriver/` and reused across runs.

## Philosophy

### Goals

- Full suite runnable locally with zero manual setup, using the same harness for both local and CI runs.
- Ready-to-use, isolated Radicle setup (CLI + node + httpd + identity + config) enabling focused and thorough testing.

### Hard constraints

Never read, write, or mutate any real state on the machine running the tests (`~/.radicle`, `~/.gitconfig`, shell profile, ssh-agent, running node/httpd). No permanent side effects even on crash. Abort before any spec runs if provisioning fails.

### Known gotchas

- **Testing workspace location:** the workspace VS Code opens lives in the OS temp dir, not in this repo. Otherwise Git and `rad` would walk up from the workspace and detect the repo's own git- and rad-initialized state confusing the conditionals selecting which view to render.
- **`pathToNodeHome` reactivity:** when a spec sets `radicle.advanced.pathToNodeHome`, the extension injects `RAD_HOME` into its Radicle CLI calls, which overrides the `HOME`-based isolation for those calls. Such a spec must point the setting at a path inside the test sandbox, never the real home.
- **Parallelism:** the "uninstalled" emulation mutates the shared test sandbox, so it is only safe with one spec per session. Parallel specs would need per-worker sandboxes.
- **macOS shell-env resolution:** VS Code can re-resolve the shell environment on launch; the pre-flight assertion catches any resulting `HOME`/`PATH` drift.
- **Windows is unsupported**, and Linux is x64 only, since Chrome for Testing publishes no Linux arm64 chromedriver (the CI matrix is macOS + Linux).

## Environment Variables

| Variable                | Default    | Purpose                           |
| ----------------------- | ---------- | --------------------------------- |
| `RADICLE_VERSION`       | _(latest)_ | Pin the Radicle CLI/node version. |
| `RADICLE_HTTPD_VERSION` | _(latest)_ | Pin the `radicle-httpd` version.  |

## Debugging

### Daemon logs

The node and httpd daemons write to `radicle-node.log` and `radicle-httpd.log` inside the emulated home (see [The Test Sandbox](#the-test-sandbox)). Tail them during a run to diagnose startup or connection issues:

```sh
tail -f $TMPDIR/radicle-vscode-extension-e2e-home/radicle-node.log $TMPDIR/radicle-vscode-extension-e2e-home/radicle-httpd.log
```

### WebdriverIO logs

wdio prints its driver and session output to the terminal. Increase `logLevel` to `'debug'` in `wdio.conf.ts` for verbose output. The mocha spec reporter prints a full failure trace inline, including the offending assertion and stack.
