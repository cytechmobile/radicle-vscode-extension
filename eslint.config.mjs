import maninak from '@maninak/eslint-config'

export default maninak({
  typescript: {
    tsconfigPath: ['./tsconfig.json', './test/e2e/tsconfig.wdio.json'],
  },
  ignores: ['src/webviews', 'static', 'dist', '.vscode-test'],
})
