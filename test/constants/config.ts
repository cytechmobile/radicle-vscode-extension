import { join } from 'node:path'

/**
 * The path to the e2e test directory. Used to create temporary directories and
 * files for testing.
 */
export const e2eTestDirPath = join(__dirname, '..')
