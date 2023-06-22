# Radicle VS Code Extension Change Log

## _(WIP, yet unreleased version)_

### ✨ Highlights

- ❤️🪵 initial ["Heartwood"](https://app.radicle.xyz/seeds/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5) support

- 🔐 Integrated authentication

### 🚀 Enhancements

- **commands:** wrap Radicle CLI commands (`sync`, etc) with auth requirement
- **auth:** unlock existing and create new Radicle identities using familiar VS Code UX
- **auth:** validate passphrase correctness in realtime as the user is typing it
- **auth:** securely store passphrase after successful user input and autotomatically re-use next time (if available)
- **commands:** new VS Code command to de-authenticate / re-lock the currently used Radicle identity and remove the associated passphrase from Secret Storage
- **config:** new config `pathToNodeHome` setting the `RAD_HOME` env variable
- **config:** new config `httpApiEndpoint` useful when reverse-proxies are running in front of `radicle-httpd` etc
- **commands:** new VS Code command to clone a Radicle project from a filterable list of all tracked ones
- **config:** set default value for existing config `pathToRadBinary`
- **log:** (explicitly) indicate in logs and notifications if an identity was pre-unlocked, got auto-unlocked using stored passphrase, got unlocked with user provided passphrase, or got created anew
- **log:** log auth status on extension init as well as on `pathToCliBinary` and `pathToNodeHome` configs' change

### 🩹 Fixes

- **config:** use previously ignored config `pathToCliBinary` to resolve Radicle CLI before executing commands
- **log:** don't log `body` param if it is empty string
- **log:** escalate user notification shown when Radicle CLI is not resolved from warning to error

### 💅 Refactors

- **store:** create new global store for extension context and replace func param drilling with new getter
- **exec:** completely rewrite foundational logic for shell script execution to be simpler, more powerful and result in cleaner client code
- **config:** use new typesafe getter and setter for accessing VS Code configuration options
- **config:** rename config `pathToBinary` -> `pathToCliBinary`
- **repo:** move functions out of overgrown `utils` directory and into new `helpers` and `ux` directories
- **repo:** add readme files documenting the intended contents of `utils`, `helpers` and `ux` directories

### 🏡 Chores

- **lint:** massively improve code linting ruleset, integrate code formatter in it and update all source code to comply
- **lint:** auto-fix most code linting & formatting issues on save for VS Code users with ESLint extension installed
- **deps:** migrate to Typescript v5.0

### 🤖 CI

- **ci:** set-up github actions for pull requests

### 📖 Documentation

- **readme:** add CTA advertising the change log
- **changelog:** add release date to title of each version and separators above them

-----

## **v0.1.2** (April 25th, 2023)

### 🩹 Fixes

- **commands:** hide Radicle commands from UI when they are not applicable

### 🏡 Chores

- **git:** define known scopes for conventionalCommits extension

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
