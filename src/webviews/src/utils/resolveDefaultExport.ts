/**
 * Returns the underlying default export of a module, unwrapping the ES-module
 * namespace layers (`{ __esModule: true, default }`) that bundlers wrap around
 * packages shipping only a CommonJS/UMD build with no `exports`/`module` entry.
 *
 * Such a package can end up wrapped once or several times depending on the
 * bundler (e.g. a default import resolves to the namespace, and a UMD module
 * re-exporting its own default nests it again), so we unwrap until we reach a
 * value that is no longer a `{ default }` wrapper. Vue otherwise rejects the
 * namespace at render time with "missing template or render function".
 * `vue3-markdown-it` is one such package.
 */
export function resolveDefaultExport(moduleOrDefault: unknown): unknown {
  const maxUnwrapDepth = 5
  let unwrapped = moduleOrDefault

  for (let depth = 0; depth < maxUnwrapDepth; depth++) {
    if (typeof unwrapped !== 'object' || unwrapped === null || !('default' in unwrapped)) {
      break
    }
    const nextUnwrapped = unwrapped.default
    if (nextUnwrapped === unwrapped) {
      break
    }
    unwrapped = nextUnwrapped
  }

  return unwrapped
}
