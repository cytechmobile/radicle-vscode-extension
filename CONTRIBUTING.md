# Contribution Guide

## Launching For Local Development

First clone the repo locally with git

```sh
git clone git@github.com:cytechmobile/radicle-vscode-extension.git
```

and open it with VS Code

```sh
code radicle-vscode-extension
```

Run the `Develop Extension` configuration in the "Run and Debug" View. This will:

- ensure you have the required dependencies and auto-align as needed
- start the task `npm: dev` to compile the source code
- launch a new VS Code window with the extension running in it
- show the console output, including any errors in a new terminal named `dev`

>Tip: Or just press `F5` to achieve the same thing.

## Package Management

We use [`pnpm`](https://pnpm.io/motivation) for node package management (f you use npm or yarn by mistake, no worries, there are fail-safes in place to save you from breaking something).

>Tip: Check out [`ni`](https://github.com/antfu/ni) to never think again about which package manager to use in which repo.

### Usage Without pnpm Globally Installed

If you _don't_ already have `pnpm` globally installed and don't want to do that, you can always prefix each pnpm command with `npx`.

```sh
pnpm install a-new-pkg # if this is what you need to do
npx pnpm install a-new-pkg # you can achieve it like this
```

## Conventions

### Paths

Because of module resolution restrictions, all paths must be relative. e.g. instead of `src/utils` (even if import auto-completion writes that) it should be corrected to `../utils`.

### Getting user input

Use custom wrapper `askUser()` instead of the native [InputBox API](https://code.visualstudio.com/api/references/vscode-api#InputBox) which would result in procedural, verbose and brittle client code.
