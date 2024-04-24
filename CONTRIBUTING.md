# Contribution Guide

## Launching For Local Development

First clone the repo locally with git

```sh
rad clone rad:z3Makm6fsQQXmpSFE43DZqwupaEhk
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

## Package locally from source

After cloning run in your terminal:

```sh
npx vsce package --no-dependencies
```

This should generate a .vsix file which you can then import into VS Code (`Ctrl + Shift + P` +  "install vsix").

## Package Management

We use [`pnpm`](https://pnpm.io/motivation) for node package management (f you use npm or yarn by mistake, no worries, there are fail-safes in place to save you from breaking something).

>Tip: Check out [`ni`](https://github.com/antfu/ni) to never think again about which package manager to use in which repo.

### Usage Without pnpm Globally Installed

If you _don't_ already have `pnpm` globally installed and don't want to do that, you can always prefix each pnpm command with `npx`.

```sh
pnpm install a-new-pkg # if this is what you need to do
npx pnpm install a-new-pkg # you can achieve it like this
```

## Developing with VS Code

While not required, for development it's strongly advised to use VS Code with all the [recommended extensions](.vscode/extensions.json) installed and enabled in the workspace of this repo.

## Conventions

### Importing extension modules inside webview modules

Any of the extension's modules (e.g. a file containing a TS type or a util function) we need to import inside a webview module (e.g. a .vue file) must be also declared as an import in [src/webviews/tsconfig.app.json](src/webviews/tsconfig.app.json) under `includes`.

Moreover we must ensure that each of those extension modules defined for the aforementioned `includes` property of the webviews app _does not import any other modules NOT defined under that same property_. That implies a clean organization of modules and a clear separation of concerns for the code inside each of them.

If necessary, specific code shared between extension and webviews should be extracted in dedicated shared modules.

### Getting user input

Use custom wrapper `askUser()` instead of the native [InputBox API](https://code.visualstudio.com/api/references/vscode-api#InputBox) which would result in procedural, verbose and brittle client code.
