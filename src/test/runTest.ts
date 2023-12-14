import * as path from 'node:path'

import { runTests } from '@vscode/test-electron'

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index')

    // Prepare the options for runTests
    const options: {
      extensionDevelopmentPath: string
      extensionTestsPath: string
      launchArgs?: string[] // Make launchArgs optional
    } = {
      extensionDevelopmentPath,
      extensionTestsPath,
    }

    // If the REPO environment variable is set, add it to launchArgs
    if (process.env['RADICLE_REPO']) {
      options.launchArgs = [path.resolve(process.env['RADICLE_REPO'])]
    }

    // Download VS Code, unzip it and run the integration test
    await runTests(options)
  } catch (err) {
    console.error('Failed to run tests')
    process.exit(1)
  }
}

main()
