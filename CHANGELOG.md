# Radicle VS Code Extension Changelog

## v0.0.2

### 🏡 Chores

- Remove unnecessary files from published artifact

### 📖 Documentation

- Introduce Changelog

## v0.0.1

> An MVP bringing getting-started and troubleshooting flows as well as basic (pre-Heartwood) Radicle integration to VS Code.

### 🚀 Enhancements

- Radicle icon in Activity Bar opening the main extension view
- Buttons to execute Pull, Push Sync Radicle commands in Activity Bar
- Button to execute Sync Radicle command in native Source Control View's title buttons (above commit message input)
- Options to execute Pull, Push Sync Radicle commands as a "Radicle" submenu in native Source Control View's three-dot-menu
- User notification on success/failure of executed Radicle commands with option to view output on failure
- Commands to execute Pull, Push Sync Radicle commands in VS Code's Command Pallette (Opens Ctrl + Shift + P or Cmd + Shift + P)
- Extension log including extension's and Radicle CLI's version in the Output Panel
- Commands to show extension's Log in VS Code's Command Pallette
- Multi-step onboarding flow with dedicated Welcome Views for specific Workspace states
- Multi-step and multi-branch Radicle CLI installation troubleshooting flow helping the user point the extension to a Radicle CLI binary
- Custom path to CLI binary configurable in the Settings (by default will not sync across VS Code instances as other user settings do)
