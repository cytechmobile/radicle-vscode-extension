# radicle-vscode-extension

Radicle extension for VS Code

## Contributing

### Package Management

We use [`pnpm`](https://pnpm.io/motivation) for node package management (but don't worry, if you use an npm or yarn command by mistake there are fail-safes in place to save you from messing up).

>Tip: check out [`ni`](https://github.com/antfu/ni) to never think again about which package manager to use in which repo.

#### Usage Without pnpm Globally Installed

If you _don't_ already have `pnpm` globally installed and don't want to do that, you can always prefix each pnpm command with `npx`.

```sh
pnpm install a-new-pkg # if this is what you need to do
npx pnpm install a-new-pkg # you can achieve it like this
```

## Launching For Local Development

Run the `Develop Extension` configuration in the "Run and Debug" view. This will:

- start the task `npm: dev` to compile the source code and watch for code changes
- launch a new VS Code window with the extension running in it
- show the console output, including any errors in a new terminal named `dev`

>Tip: Or just press `F5` to achieve the same thing
