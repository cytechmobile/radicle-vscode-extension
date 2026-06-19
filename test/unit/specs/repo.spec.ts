import type { Mock } from 'vitest'
import type { Repo } from '../../../src/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commands, window } from 'vscode'
import { execRad, fetchFromHttpd } from '../../../src/helpers'
import { getRepoRoot, showLog } from '../../../src/utils'
import { notifyUserAboutFetchError } from '../../../src/ux/httpdConnection'
import { pickAndCloneRadicleRepo } from '../../../src/ux/repo'

vi.mock('../../../src/helpers', () => ({ execRad: vi.fn(), fetchFromHttpd: vi.fn() }))
vi.mock('../../../src/utils', () => ({ getRepoRoot: vi.fn(), log: vi.fn(), showLog: vi.fn() }))
vi.mock('../../../src/ux/httpdConnection', () => ({ notifyUserAboutFetchError: vi.fn() }))

interface PickItem {
  label: string
  description: string
  detail?: string
  rid: string
}

interface OpenDialogOptions {
  title: string
  openLabel: string
  canSelectMany: boolean
  canSelectFiles: boolean
  canSelectFolders: boolean
}

interface ExecRadOptions {
  cwd: string
  timeout: number
  shouldLog: boolean
}

// `vscode` and the heavily-overloaded helpers carry class and union types that fight the mock
// setters, so we treat the (already mocked) functions as plainly-typed mocks. The real types
// still guard the code under test at type-check time.
const fetchFromHttpdMock = fetchFromHttpd as unknown as Mock
const getRepoRootMock = getRepoRoot as unknown as Mock
const showLogMock = showLog as unknown as Mock
const notifyUserAboutFetchErrorMock = notifyUserAboutFetchError as unknown as Mock
const showInformationMessageMock = window.showInformationMessage as unknown as Mock
const showErrorMessageMock = window.showErrorMessage as unknown as Mock
const withProgressMock = window.withProgress as unknown as Mock
const execRadMock = execRad as unknown as Mock<
  (args: string[], options: ExecRadOptions) => unknown
>
const showQuickPickMock = window.showQuickPick as unknown as Mock<
  (items: PickItem[], options: Record<string, unknown>) => Promise<PickItem | undefined>
>
const showOpenDialogMock = window.showOpenDialog as unknown as Mock<
  (options: OpenDialogOptions) => Promise<{ fsPath: string }[] | undefined>
>
const executeCommandMock = commands.executeCommand as unknown as Mock<
  (command: string, uri: { fsPath: string }, options: { forceNewWindow: boolean }) => unknown
>

function makeRepo(props: {
  rid: string
  name: string
  description: string
  seeding: number
}): Repo {
  return {
    rid: props.rid,
    payloads: {
      'xyz.radicle.project': {
        data: { name: props.name, description: props.description, defaultBranch: 'main' },
        meta: {
          head: 'deadbeef',
          patches: { open: 0, draft: 0, archived: 0, merged: 0 },
          issues: { open: 0, closed: 0 },
        },
      },
    },
    delegates: [],
    threshold: 1,
    seeding: props.seeding,
    visibility: { type: 'public' },
    refs: { tags: {}, refs: {} },
  }
}

function resolveRepos(repos: Repo[]): void {
  fetchFromHttpdMock.mockResolvedValue({ data: repos })
}

function pickRepoLocation(fsPath: string): void {
  showOpenDialogMock.mockResolvedValue([{ fsPath }])
}

const heartwood = makeRepo({
  rid: 'rad:zHEART',
  name: 'heartwood',
  description: 'Radicle Heartwood Protocol & Stack',
  seeding: 42,
})

describe('pickAndCloneRadicleRepo()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Run the wrapped task so the progress wrapper is transparent to the assertions.
    withProgressMock.mockImplementation((_options: unknown, task: () => unknown) => task())
    getRepoRootMock.mockReturnValue(undefined)
  })

  describe('The repo list', () => {
    it('sorts items by seed count, descending', async () => {
      resolveRepos([
        makeRepo({ rid: 'rad:zLOW', name: 'low', description: '', seeding: 5 }),
        makeRepo({ rid: 'rad:zHIGH', name: 'high', description: '', seeding: 50 }),
        makeRepo({ rid: 'rad:zMID', name: 'mid', description: '', seeding: 20 }),
      ])
      showQuickPickMock.mockResolvedValue(undefined)

      await pickAndCloneRadicleRepo()
      const items = showQuickPickMock.mock.calls[0]![0]

      expect(items.map((item) => item.label)).toEqual(['high', 'mid', 'low'])
    })
  })

  describe('When fetching the repo list fails', () => {
    it('notifies about the error and neither shows a picker nor clones', async () => {
      const error = new Error('httpd unreachable')
      fetchFromHttpdMock.mockResolvedValue({ error })

      await pickAndCloneRadicleRepo()

      expect(notifyUserAboutFetchErrorMock).toHaveBeenCalledWith(error)
      expect(showQuickPickMock).not.toHaveBeenCalled()
      expect(execRadMock).not.toHaveBeenCalled()
    })
  })

  describe('Authentication', () => {
    // Regression: cloning used to be gated behind an authentication flow it did not need. The
    // command must reach the network to list repos with no prior identity granted.
    it('lists repos without first requiring an authenticated identity', async () => {
      resolveRepos([])
      showQuickPickMock.mockResolvedValue(undefined)

      await pickAndCloneRadicleRepo()

      expect(fetchFromHttpdMock).toHaveBeenCalledWith('/repos', { query: { show: 'all' } })
    })
  })

  describe('When the user cancels', () => {
    it('does nothing if no repo is picked', async () => {
      resolveRepos([heartwood])
      showQuickPickMock.mockResolvedValue(undefined)

      await pickAndCloneRadicleRepo()

      expect(showOpenDialogMock).not.toHaveBeenCalled()
      expect(execRadMock).not.toHaveBeenCalled()
    })

    it('does not clone if no folder is picked', async () => {
      resolveRepos([heartwood])
      showQuickPickMock.mockResolvedValue({
        rid: 'rad:zHEART',
        label: 'heartwood',
        description: '',
      })
      showOpenDialogMock.mockResolvedValue(undefined)

      await pickAndCloneRadicleRepo()

      expect(execRadMock).not.toHaveBeenCalled()
    })
  })

  describe('Cloning', () => {
    beforeEach(() => {
      resolveRepos([heartwood])
      showQuickPickMock.mockResolvedValue({
        rid: 'rad:zHEART',
        label: 'heartwood',
        description: '',
      })
      pickRepoLocation('/home/me/code')
      execRadMock.mockReturnValue({ stdout: '' })
      showInformationMessageMock.mockResolvedValue(undefined)
    })

    it('checks out into a subfolder named after the repo, inside the picked location', async () => {
      await pickAndCloneRadicleRepo()
      const [args, options] = execRadMock.mock.calls[0]!

      expect(args[2]).toBe('/home/me/code/heartwood')
      expect(options.cwd).toBe('/home/me/code')
    })

    it('opens exactly the checked-out folder when the user chooses to open it', async () => {
      showInformationMessageMock.mockResolvedValue('Open in new window')

      await pickAndCloneRadicleRepo()
      const [command, uri, options] = executeCommandMock.mock.calls[0]!

      expect(command).toBe('vscode.openFolder')
      expect(uri.fsPath).toBe('/home/me/code/heartwood')
      expect(options).toEqual({ forceNewWindow: true })
    })
  })

  describe('When cloning fails', () => {
    beforeEach(() => {
      resolveRepos([heartwood])
      showQuickPickMock.mockResolvedValue({
        rid: 'rad:zHEART',
        label: 'heartwood',
        description: '',
      })
      pickRepoLocation('/home/me/code')
      execRadMock.mockReturnValue({ errorCode: 1 })
    })

    it('reports the failure, offers the log, and opens no folder', async () => {
      showErrorMessageMock.mockResolvedValue('Show output')

      await pickAndCloneRadicleRepo()

      expect(showErrorMessageMock).toHaveBeenCalled()
      expect(showLogMock).toHaveBeenCalled()
      expect(executeCommandMock).not.toHaveBeenCalled()
    })

    it('does not open the log when the failure prompt is dismissed', async () => {
      showErrorMessageMock.mockResolvedValue(undefined)

      await pickAndCloneRadicleRepo()

      expect(showLogMock).not.toHaveBeenCalled()
    })
  })
})
