import { tmpdir } from 'node:os'
import { sep } from 'node:path'

export const extTempDir = `${tmpdir()}${sep}radicle`
