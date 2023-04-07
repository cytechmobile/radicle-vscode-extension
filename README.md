![radicle-screenshot](./assets/for-md/hero.png)

# Radicle

A VS Code extension bringing support for the Radicle network to your IDE.

[Radicle]((https://radicle.xyz/)) is a Github alternative bringing familiar features (e.g. Pull Requests, Issues, etc) over a free, open-source and peer-to-peer network, built on top of Git.

> **NOTE:** The extension supports the Radicle CLI up to v0.6.x . Support for experimental newer versions of the CLI (codename "Heartwood") is [planned](https://github.com/cytechmobile/radicle-vscode-extension/milestone/2) and coming soon.

## Features

- Multiple integrated ways to [execute Radicle commands](#integrated-radicle-commands) right from your IDE. Use whichever fits your workflow best.
- [Onboarding flow](#onboarding-flow) with tips specialized to whichever state your Workspace is in when starting out
- [Notifications](#user-notifications) will inform you of important events or warn you if something is wrong, sometimes even offering assistance to fix the issue (while trying not to spam you)
- [Troubleshooting flow](#troubleshooting-flow) helping you point the extension to a Radicle CLI binary (if it didn't already auto-resolve)
- [Configurable path to CLI binary](#configurable-path-to-cli-binary) in the Settings (by default will not sync VS Code instances as other user settings do)

### Integrated Radicle Commands

- Buttons to execute Pull, Push Sync Radicle commands in the main extension View

    ![Buttons to execute Pull, Push Sync Radicle commands in the main extension View](assets/for-md/rad-cmds-in-main-view.png)

- Commands to execute Pull, Push Sync Radicle commands in VS Code's Command Palette

    ![Commands to execute Pull, Push Sync Radicle commands in VS Code's Command Palette](assets/for-md/rad-cmds-in-palette.png)

- Button to execute Sync Radicle command in native Source Control View's title buttons (above commit message input)

    ![Button to execute Sync Radicle command in native Source Control View's title buttons (above commit message input)](assets/for-md/rad-cmds-in-scm-title.png)

- List items to execute Pull, Push Sync Radicle commands grouped in a "Radicle" submenu inside the native Source Control View's three-dot-menu

    ![List items to execute Pull, Push Sync Radicle commands grouped in a "Radicle" submenu inside the native Source Control View's three-dot-menu](assets/for-md/rad-cmds-in-scm-3dot.png)

### Onboarding Flow

- Non-git-initialized folder opened in Workspace

    ![Non-git-initialized folder opened in Workspace](assets/for-md/non-git-init-welcome-view.png)

- Non-radicle-initialized repo opened in Workspace

    ![Non-radicle-initialized repo opened in Workspace](assets/for-md/non-rad-init-welcome-view.png)

- _etc._

### User Notifications

- Successful execution of Radicle CLI commands

    ![Successful execution of Radicle CLI commands](assets/for-md/rad-exec-success.png)

- Failed execution of Radicle CLI commands

    ![Failed execution of Radicle CLI commands](assets/for-md/rad-exec-fail.png)

- Extension could not resolve Radicle CLI

    ![Extension could not resolve Radicle CLI](assets/for-md/cli-404.png)

- Radicle CLI installation just got fixed

    ![Radicle CLI installation just got fixed](assets/for-md/cli-404-fixed.png)

### Troubleshooting Flow

![Troubleshooting Flow](assets/for-md/toubleshoot.png)

### Configurable path to CLI binary

![Configurable path to CLI binary](assets/for-md/rad-path.png)

## Contributing


Please see the [Contribution Guide](./CONTRIBUTING.md).
