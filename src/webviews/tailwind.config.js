/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  safelist: [
    { pattern: /(bg|text)-patch-(draft|open|archived|merged)/ },
    { pattern: /(bg|text|outline)-vscode-(pre|editor)-(foreground|background)/ },
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        patch: {
          draft: 'var(--vscode-patch-draft)',
          open: 'var(--vscode-patch-open)',
          archived: 'var(--vscode-patch-archived)',
          merged: 'var(--vscode-patch-merged)',
        },
        vscode: {
          'pre-foreground': 'var(--vscode-textPreformat-foreground)',
          'pre-background': 'var(--vscode-textPreformat-background)',
          'editor-foreground': 'var(--vscode-editor-foreground)',
          'editor-background': 'var(--vscode-editor-background)',
        },
      },
    },
  },
  plugins: [],
}
