import memoize from 'lodash/memoize'
import debounce from 'lodash/debounce'

/**
 * Constructs a function memoized by its stringified first param and a debounced function
 * clearing its cache.
 *
 * Handy to optimize successive calls of expensive functions with frequently repeating params,
 * which should not be memoized for long e.g. because they aren't pure.
 *
 * @param func The function we want to memoize
 * @param {number} [wait=0] The minimum amount of time to wait after the last time a cache clear was
 * requested, before it actually happens
 *
 * @example
 * ```
 * const {
 *  memoizedFunc: memoizedGetCurrentGitBranch,
 *  debouncedClearMemoizedFuncCache: debouncedClearMemoizedGetCurrentGitBranchCache,
 * } = memoizeWithDebouncedCacheClear(getCurrentGitBranch, 200)
 *
 * function isPatchCheckedOut(patch: Pick<Patch, 'id'>): boolean {
 *  debouncedClearMemoizedGetCurrentGitBranchCache()
 *  const branchName = memoizedGetCurrentGitBranch()
 *  const isCheckedOut = Boolean(branchName?.includes(shortenHash(patch.id)))
 *
 *  return isCheckedOut
 * }
 * ```
 */
// eslint-disable-next-line space-before-function-paren, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
export function memoizeWithDebouncedCacheClear<T extends (...args: any) => unknown>(
  func: T,
  wait = 0,
) {
  const memoizedFunc = memoize(func)
  const debouncedClearMemoizedFuncCache = debounce(() => memoizedFunc.cache.clear?.(), wait)

  return { memoizedFunc, debouncedClearMemoizedFuncCache }
}
