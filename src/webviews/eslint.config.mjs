import maninak from '@maninak/eslint-config'

export default maninak(
  {
    typescript: {
      tsconfigPath: ['./tsconfig.app.json', './tsconfig.node.json', './tsconfig.vitest.json'],
    },
    requireJsdocInUtils: true,
  },
  {
    rules: {
      // VS Code webview UI toolkit components are registered globally at runtime via
      // provideVSCodeDesignSystem(); the static analyser can't see dynamic registration.
      'vue/no-undef-components': [
        'warn',
        {
          ignorePatterns: [
            'vscode-button',
            'vscode-dropdown',
            'vscode-option',
            'vscode-panel-tab',
            'vscode-panel-view',
            'vscode-panels',
            'vscode-radio',
            'vscode-radio-group',
            'vscode-text-area',
          ],
        },
      ],

      // extensionUtils/* and extensionHelpers/* are Vite aliases that resolve to sibling
      // packages in the extension's source tree outside this sub-project's src/. They are
      // monorepo-internal — above @/ project aliases but below external npm packages.
      'perfectionist/sort-imports': [
        'warn',
        {
          internalPattern: ['^@/', '^~/'],
          customGroups: [
            {
              groupName: 'extension-internal',
              elementNamePattern: '^extension(?:Utils|Helpers)/',
            },
          ],
          groups: [
            'type-import',
            ['type-parent', 'type-sibling', 'type-index', 'type-internal'],
            'value-builtin',
            'value-external',
            'extension-internal',
            'value-internal',
            ['value-parent', 'value-sibling', 'value-index'],
            'side-effect',
            'ts-equals-import',
            'unknown',
          ],
          newlinesBetween: 'ignore',
          newlinesInside: 'ignore',
          order: 'asc',
          type: 'natural',
        },
      ],
    },
  },
)
