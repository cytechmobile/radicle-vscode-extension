# Contribution Guide

If you are interested to contribute to the development of Radicle VS Code Extension keep reading for information and instructions.

## Feedback, Questions and Ideas

Please always be respectful to the maintainers and all other community members. Here's how to reach out:

### Chat

If there's anything you need to ask or share with the maintainers, we'd love to hear from you on our [Zulip channel](https://radicle.zulipchat.com/#narrow/stream/380896-integrations). Create a new topic prefixed with `[vscode]` e.g. `[vscode] <your topic's subject here>` and anything you want to say. Somebody will get back to you ASAP.

### Issues

For more concrete issues like specced out features and bug reports you could also file an issue against our [repo](https://app.radicle.at/nodes/seed.radicle.at/rad:z3Makm6fsQQXmpSFE43DZqwupaEhk). To do that you can [use the Web UI](https://app.radicle.at/nodes/seed.radicle.at/rad:z3Makm6fsQQXmpSFE43DZqwupaEhk/issues) or the [CLI](https://radicle.xyz/guides/user#working-with-issues). Make sure to [clone the `radicle-vscode-extension` repo](#cloning-the-radicle-vscode-repo-repo-locally) if you haven't already.

When filing an issue please:

1. try to provide as much context and be as clear as possible while also being terse and to the point
2. if you are filing a bug then also provide reproduction steps as well as the expected and actual behaviours
3. be patient, considerate of the maintainers' time and their existing priorities. In case your issue can't be addressed in your ideal timeframe, consider creating a patch, letting us know about it and which in the meantime you can [package and install in your vscode](#package-locally-from-source).

## Cloning the `radicle-vscode-repo` Repo Locally

Choose any of the following options:

### Cloning using the Radicle extension itself

Open VS Code's Command Palette (`Ctrl/Cmd + Shift + P`) and type in `> rad clone` then run the related command shown and follow the instructions.

### Cloning using the Radicle CLI

```sh
rad clone rad:z3Makm6fsQQXmpSFE43DZqwupaEhk
```

You can find more info about `rad clone` in the [Radicle User Guide](https://radicle.xyz/guides/user#the-basics-of-seeding-and-cloning).

## Launching For Local Development

After [cloning the repo locally](#cloning-the-radicle-vscode-repo-repo-locally) and opening it in VS Code, run the `Develop Extension` configuration from the "Run and Debug" View. This will:

- ensure you have the required dependencies and auto-align as needed
- start the task `npm: dev` to compile the source code
- launch a new VS Code window with the extension running in it
- show the console output, including any errors in a new terminal named `dev`

>Tip: Or just press `F5` to achieve the same thing.

## Package locally from source

After [cloning the repo locally](#cloning-the-radicle-vscode-repo-repo-locally) and changing into the cloned repo's directory, run in your terminal:

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
