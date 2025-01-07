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

/**
 * The path to the node home directory. This is where the Radicle node stores its
 * configuration and data.
 */
export const nodeHomePath = process.env['RAD_HOME']

/**
 * The path to a backup node home directory. This is used to store the original
 * node home directory for tests that require the original path to be moved or
 * modified.
 */
export const backupNodeHomePath = `${nodeHomePath}.backup`
