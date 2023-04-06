# Radicle VS Code Extension Changelog

## _(WIP, yet unreleased version)_

### 🩹 Fixes

- Typo fix in Welcome View of non-rad-initialized repo (thanks for reporting @bordumb 🙌)

### 📖 Documentation

- Polish enhancements list of v0.0.1 on CHANGELOG

## v0.1.0

> 🆙 Minor version bump to officially mark the release of the long-awaited MVP! 🥳
>
> Please refer to [v0.0.1](#v001) for the shiny features list ✨
>(bear with us as we work out our versioning/release/changelog/documentation flows)

### 📖 Documentation

- Minor improvements to the documentation of feature lists

## v0.0.3

### 📖 Documentation

- Update README and extract content to CONTRIBUTING

## v0.0.2

### 🏡 Chores

- Remove unnecessary files from published artifact

### 📖 Documentation

- Introduce Changelog

## v0.0.1

> An MVP bringing getting-started and troubleshooting flows as well as basic (pre-Heartwood) Radicle integration to VS Code.

### 🚀 Enhancements

- Radicle icon in Activity Bar opening the main extension View
- Buttons to execute Pull, Push Sync Radicle commands in the main extension View
- Button to execute Sync Radicle command in native Source Control View's title buttons (above commit message input)
- Commands to execute Pull, Push Sync Radicle commands in VS Code's Command Palette (Opens with Ctrl+Shift+P or Cmd+Shift+P)
- List items to execute Pull, Push Sync Radicle commands grouped in a "Radicle" submenu inside native Source Control View's three-dot-menu
- User notification on success/failure of executed Radicle commands with the option to view the CLI's output
- Log including extension's and Radicle CLI's version in the Output Panel
- Command to show extension's Log in VS Code's Command Palette
- Multi-step onboarding flow with dedicated Welcome Views for specific Workspace states
- Multi-step and multi-branch Radicle CLI installation troubleshooting flow helping the user point the extension to a Radicle CLI binary
- Configurable path to CLI binary in the Settings (by default will not sync VS Code instances as other user settings do)
