![radicle-screenshot](./assets/for-md/hero.png)

# Radicle VS Code Extension
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/radicle-ide-plugins-team.radicle?include_prereleases&style=flat&logo=radicle&logoColor=FFFFFF&color=EEE811)](https://marketplace.visualstudio.com/items?itemName=radicle-ide-plugins-team.radicle)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/radicle-ide-plugins-team.radicle?style=flat&logo=radicle&logoColor=FFFFFF&color=66B3FF)](https://marketplace.visualstudio.com/items?itemName=radicle-ide-plugins-team.radicle)
[![rad: - z2BdUVZFvHdxRfdtGJQdSH2kyXNM6](https://img.shields.io/static/v1?label=rad%3A&message=z2BdUVZFvHdxRfdtGJQdSH2kyXNM6&color=6666FF&logo=radicle&logoColor=FFFFFF)](https://https://app.radicle.at/nodes/seed.radicle.at/rad:z3Makm6fsQQXmpSFE43DZqwupaEhk)


A VS Code extension bringing support for the Radicle network to your IDE.

[Radicle](https://radicle.xyz/) is a GitHub alternative bringing familiar features like Pull Requests, Issues, etc, via a peer-to-peer, free and open-source network built on top of Git.

> **NOTE:** The extension currently offers partial support for the latest version of the Radicle CLI (codename "Heartwood"). Support for Radicle Patches is [under active development](https://github.com/cytechmobile/radicle-vscode-extension/milestone/5) and further features like Issues are next on the pipeline.

## Features

> _See the latest, as well as upcoming, updates in the [🗒️ Change Log](CHANGELOG.md)._

- 🖲️ [Radicle Commands](#integrated-radicle-commands) everywhere you need them
- 📋 [Patches View](#patches-view) offers a glance at the status of code changes in your project
- 📑 [Patch Detail View](#patch-detail-view) offers in-depth information for a specific patch
- 🔐 [Integrated Authentication](#integrated-authentication) eases your Radicle Identity management
- 📥 [Cloning](#cloning) of seeded Radicle projects
- 🗺️ [Onboarding Flow](#onboarding-flow) with tips tuned to whichever state your Workspace is in when starting out
- 🕵️‍♂️ [Troubleshooting Flow](#troubleshooting-flow) helping you point the extension to a Radicle CLI binary (if it didn't already auto-resolve)
- 🎛️ [Configurable](#configurable) via VS Code's native Settings
- 📜 [Integrated Logging](#integrated-logging) including Radicle CLI's command output

### Integrated Radicle Commands

- Run common Radicle commands with dedicated buttons from within the main extension View

    ![Buttons to execute Radicle commands in the main extension View](assets/for-md/rad-cmds-in-main-view.png)

- Run Radicle commands from within VS Code's Command Palette

    ![Execute Radicle commands from within VS Code's Command Palette](assets/for-md/rad-cmds-in-palette.png)

- Sync with the Radicle network with a dedicated button among the native Source Control View's title buttons (above commit message input)

    ![Sync with the Radicle network with a dedicated button among the native Source Control View's title buttons (above commit message input)](assets/for-md/rad-cmds-in-scm-title.png)

- Find Radicle commands grouped as a "Radicle" submenu inside the native Source Control View's three-dot-menu

    ![Find Radicle commands grouped as a "Radicle" submenu inside the native Source Control View's three-dot-menu](assets/for-md/rad-cmds-in-scm-3dot.png)

### Patches View

Browse Radicle Patches, check out their associated git branches and inspect their file changes and diffs.

![screenshot of Radicle Patches view](./assets/for-md/patches-diff.png)

### Patch Detail View

Inspect all details you'd want to know about a patch including discussions, details of a specific revision as well as all events that took place during the lifetime of the patch.

![Patch detail view](./assets/for-md/patch-detail.png)

### Integrated Authentication

- Create a new Radicle identity, if none exists in your configured Radicle home directory

    ![Create new identity](assets/for-md/auth-create-id.png)

- Unlock an existing identity

    ![Unlock existing identity](assets/for-md/auth-unlock-id.png)

- De-authenticate your currently unlocked identity

    ![de-authenticate identity](assets/for-md/auth-lock-id.png)

### Cloning

- Invoke the CLI's `rad clone` command from the Command Palette

    ![rad clone listed in command palette](assets/for-md/rad-clone-palette.png)

- Select from a filterable list of projects that your Radicle node is seeding

    ![rad clone listed projects](assets/for-md/rad-clone-choose.png)

- Open the newly cloned repo in another VS Code window with a single click

    ![rad clone success](assets/for-md/rad-clone-success.png)

### Onboarding Flow

- No folder opened in Workspace

    ![no folder opened in Workspace](assets/for-md/no-folder-init-welcome-view.png)

- Non-git-initialized folder opened in Workspace

    ![Non-git-initialized folder opened in Workspace](assets/for-md/non-git-init-welcome-view.png)

- Non-radicle-initialized repo opened in Workspace

    ![Non-radicle-initialized repo opened in Workspace](assets/for-md/non-rad-init-welcome-view.png)

### Troubleshooting Flow

![Troubleshooting Flow](./assets/for-md/troubleshoot.png)

### Configurable

Set environment variables for the Radicle CLI and more from VS Code's settings

![Extension configurations](assets/for-md/configs.png)

### Integrated Logging

![Integrated logging](assets/for-md/logs.png)

## Contributing

Please see the [Contribution Guide](./CONTRIBUTING.md).
