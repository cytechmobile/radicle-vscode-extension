# Radicle VS Code Extension Change Log

## _(WIP, yet unreleased version)_

### 🩹 Fixes

- **commands:** replace pre-heartwood, now deprecated rad pull/push commands with fetch/announce across multiple UI locations ([#42](https://github.com/cytechmobile/radicle-vscode-extension/issues/42))

-----

## **v0.2.1** (June 29th, 2023)

### 🩹 Fixes

- **onboarding:** don't get stuck in "non-rad-initialized repo" Welcome View, despite having a rad-initialized repo open ([#52](https://github.com/cytechmobile/radicle-vscode-extension/issues/52))
- **onboarding:** address typos and improve copy of "non-rad-initialized repo" Welcome View ([#52](https://github.com/cytechmobile/radicle-vscode-extension/issues/52))
- **onboarding:** don't point the user to no-longer existent Getting Started guide ([#52](https://github.com/cytechmobile/radicle-vscode-extension/issues/52))

### 💅 Refactors

- **when-clause-context:** rename `isRepoRadInitialised` --> `isRadInitialized` ([#52](https://github.com/cytechmobile/radicle-vscode-extension/issues/52))

### 📖 Documentation

- **readme:** use up-to-date screenshot of "non-rad-initialized repo" Welcome View in Onboarding examples ([#52](https://github.com/cytechmobile/radicle-vscode-extension/issues/52))

-----

## **v0.2.0** (June 28th, 2023)

### ✨ Highlights

- ❤️🪵 Initial ["Heartwood"](https://app.radicle.xyz/seeds/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5) support
- 🔐 Integrated authentication
- 📥 Cloning of tracked Radicle projects
- 🏗️ Improved development tooling and infrastructure for maintainers

### 🚀 Enhancements

- **commands:** wrap Radicle CLI commands (`sync`, etc) with auth requirement ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **auth:** unlock existing and create new Radicle identities using familiar VS Code UX ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **auth:** validate passphrase correctness in realtime as the user is typing it ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **auth:** securely store passphrase after successful user input and autotomatically re-use next time (if available) ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **commands:** new VS Code command to de-authenticate / re-lock the currently used Radicle identity and remove the associated passphrase from Secret Storage ([#33](https://github.com/cytechmobile/radicle-vscode-extension/issues/33))
- **log:** indicate in logs and notifications if an identity was pre-unlocked, got auto-unlocked using stored passphrase, got unlocked with user provided passphrase, or got created anew ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **config:** new `pathToNodeHome` setting, which sets the `RAD_HOME` env variable ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **config:**  new `httpApiEndpoint` setting, useful when reverse-proxies are running in front of `radicle-httpd` etc ([#26](https://github.com/cytechmobile/radicle-vscode-extension/issues/26))
- **commands:** new VS Code command to clone a Radicle project from a filterable list of all tracked ones ([#27](https://github.com/cytechmobile/radicle-vscode-extension/issues/27))
- **commands:** show rad clone command in the native Source Control three-dot-menu's Radicle submenu ([#27](https://github.com/cytechmobile/radicle-vscode-extension/issues/27))
- **onboarding:** when opening VS Code without any folder in the workspace show in the dedicated Welcome View an additional button to clone from Radicle ([#27](https://github.com/cytechmobile/radicle-vscode-extension/issues/27))
- **config:** set default value for existing config `pathToRadBinary` ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **log:** log auth status on extension init as well as on `pathToCliBinary` and `pathToNodeHome` configs' change ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))

### 🩹 Fixes

- **config:** use previously ignored config `pathToCliBinary` to resolve Radicle CLI before executing commands ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **log:** don't log `body` param if it is empty string
- **log:** escalate user notification shown when Radicle CLI is not resolved from warning to error ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))

### 💅 Refactors

- **store:** create new global store for extension context and replace func param drilling with new getter ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **exec:** completely rewrite foundational logic for shell script execution to be simpler, more powerful and result in cleaner client code ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **config:** use new typesafe getter and setter for accessing VS Code configuration options ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **config:** rename config `pathToBinary` -> `pathToCliBinary` ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **repo:** move functions out of overgrown `utils` directory and into new `helpers` and `ux` directories ([#34](https://github.com/cytechmobile/radicle-vscode-extension/issues/34))
- **repo:** add readme files documenting the intended contents of `utils`, `helpers` and `ux` directories ([8da729e](https://github.com/cytechmobile/radicle-vscode-extension/commit/8da729ee16726484859cf4c56592c7d7189699f8))

### 🏡 Chores

- **build:** support runtime dependencies by bundling them and our source code for production using esbuild ([#41](https://github.com/cytechmobile/radicle-vscode-extension/issues/41))
- **lint:** massively improve code linting ruleset, integrate code formatter in it and update all source code to comply ([#13](https://github.com/cytechmobile/radicle-vscode-extension/issues/13))
- **lint:** auto-fix most code linting & formatting issues on save for VS Code users with ESLint extension installed ([#13](https://github.com/cytechmobile/radicle-vscode-extension/issues/13))
- **deps:** migrate to Typescript v5.0 ([1234e06](https://github.com/cytechmobile/radicle-vscode-extension/commit/1234e06112ecc941c213614852bdb53037cd6833))

### 🤖 CI

- **ci:** set-up github actions for pull requests ([#1](https://github.com/cytechmobile/radicle-vscode-extension/issues/1))

### 📖 Documentation

- **readme:** add CTA advertising the change log ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **readme:** bring up to date with latest changes ([#48](https://github.com/cytechmobile/radicle-vscode-extension/issues/48))
- **changelog:** add release date to title of each version and separators above them ([#28](https://github.com/cytechmobile/radicle-vscode-extension/issues/28))
- **changelog:** reference related PRs/commits for each change ([#48](https://github.com/cytechmobile/radicle-vscode-extension/issues/48))

-----

## **v0.1.2** (April 25th, 2023)

### 🩹 Fixes

- **commands:** hide Radicle commands from UI when they are not applicable ([#25](https://github.com/cytechmobile/radicle-vscode-extension/issues/25))

### 🏡 Chores

- **git:** define known scopes for conventionalCommits extension ([ded7fcf](https://github.com/cytechmobile/radicle-vscode-extension/commit/ded7fcf64d7864a95a96bc53df0512d41bfbe0f5))

### 📖 Documentation

- **readme:** add missing reference to integrated logging feature
- **readme:** fix link to Radicle homepage
- **readme:** fix broken reference to image showcasing integrated logging feature
- **changelog:** prefix changes with context and remove quotations formatting

-----

## **v0.1.1** (April 5th, 2023)

### 🩹 Fixes

- **commands:** use a more minimal UI to notify user of Radicle command success
- **onboarding:** typo fix in copy of non-rad-initialized repo's Welcome View (thanks for reporting @bordumb 🙌)

### 📖 Documentation

- **readme:** revamp with simpler feature list, visual examples of each and a short definition of the Radicle network
- **changelog:** polishing of enhancements list of v0.0.1

-----

## **v0.1.0** (April 5th, 2023)

Minor version bump to officially mark the release of the long-awaited MVP! 🥳

Please refer to [v0.0.1](#v001) for the shiny features list ✨ (bear with us as we work out our versioning/release/changelog/documentation flows)

### 📖 Documentation

- **changelog:** improve copy of features list

## **v0.0.3** (April 5th, 2023)

### 📖 Documentation

- **readme:** update and partially extract content to CONTRIBUTING

-----

## **v0.0.2** (April 5th, 2023)

### 🏡 Chores

- **publish:** remove unnecessary files from published artifact

### 📖 Documentation

- **changelog:** introduce Changelog

-----

## **v0.0.1** (April 5th, 2023)

An MVP bringing getting-started and troubleshooting flows as well as basic (pre-Heartwood) Radicle integration to VS Code.

### 🚀 Enhancements

- Radicle icon in Activity Bar opening the main extension View
- Buttons to execute Pull, Push Sync Radicle commands in the main extension View
- Button to execute Sync Radicle command in native Source Control View's title buttons (above commit message input)
- Commands to execute Pull, Push Sync Radicle commands in VS Code's Command Palette (Opens with Ctrl+Shift+P or Cmd+Shift+P)
- List items to execute Pull, Push Sync Radicle commands grouped in a "Radicle" submenu inside the native Source Control View's three-dot-menu
- User notification on success/failure of executed Radicle commands with the option to view the CLI's output
- Log including extension's and Radicle CLI's version in the Output Panel
- Command to show extension's Log in VS Code's Command Palette
- Multi-step onboarding flow with dedicated Welcome Views for specific Workspace states
- Multi-step and multi-branch Radicle CLI installation troubleshooting flow helping the user point the extension to a Radicle CLI binary
- Configurable path to CLI binary in the Settings (by default will not sync VS Code instances as other user settings do)
