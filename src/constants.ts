import { sep } from 'node:path'
import { tmpdir } from 'node:os'

export const extTempDir = `${tmpdir()}${sep}radicle`
