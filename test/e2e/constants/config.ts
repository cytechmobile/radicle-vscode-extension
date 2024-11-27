import { join } from 'node:path'

/**
 * The path to the e2e test directory. Used to create temporary directories and
 * files for testing.
 */
export const e2eTestDirPath = join(__dirname, '..')

/**
 * The path to the root directory of the repository. Used when needing to access
 * files outside of the e2e test directory.
 */
export const rootDirPath = join(__dirname, '../../..')
