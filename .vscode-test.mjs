import { defineConfig } from '@vscode/test-cli';

// sample, from https://code.visualstudio.com/api/working-with-extensions/testing-extension
export default defineConfig([
  {
    label: 'endToEndTests',
    files: 'dist/test/**/*.test.js',
    // version: 'insiders',
    workspaceFolder: './',
    mocha: {
      ui: 'tdd',
      timeout: 20000
    }
  }
  // you can specify additional test configurations, too
]);