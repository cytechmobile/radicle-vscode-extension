import { describe, expect, it } from 'vitest'
import { resolveDefaultExport } from '../resolveDefaultExport'

// A stand-in for a component-like default export: an object that is itself the
// real value and is not a `{ default }` interop wrapper.
const component = { name: 'some-component', setup: () => undefined }

describe('resolveDefaultExport', () => {
  it('unwraps a single interop layer (dev/pre-bundled shape)', () => {
    const moduleNamespace = { default: component }

    expect(resolveDefaultExport(moduleNamespace)).toBe(component)
  })

  it('unwraps nested interop layers (UMD double-wrapped by the bundler)', () => {
    const innerNamespace = { __esModule: true, default: component }
    const outerNamespace = { default: innerNamespace }

    expect(resolveDefaultExport(outerNamespace)).toBe(component)
  })

  it('returns a value that is already the export unchanged', () => {
    expect(resolveDefaultExport(component)).toBe(component)
  })

  it('returns primitives unchanged', () => {
    expect(resolveDefaultExport('plain')).toBe('plain')
  })

  it('does not loop on a self-referential default', () => {
    const selfReferential: { default: unknown } = { default: undefined }
    selfReferential.default = selfReferential

    expect(resolveDefaultExport(selfReferential)).toBe(selfReferential)
  })
})
