# radicle-vscode-extension

Radicle extension for VS Code

## Contributing

### Package Management

We use [`pnpm`](https://pnpm.io/motivation) for node package management (but don't worry, if you use an npm or yarn command by mistake there are fail-safes in place to save you from messing up).

If you _don't_ already have `pnpm` globally installed and don't want to do that, you can always prefix each pnpm command with `npx`.

```sh
pnpm install a-new-pkg # if this is what you need to do
npx pnpm install a-new-pkg # you can achieve it like this
```

>Tip: check out [`ni`](https://github.com/antfu/ni) to never think about which package manager to use in which repo again.