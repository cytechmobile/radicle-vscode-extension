import memoize from 'lodash/memoize'
import debounce from 'lodash/debounce'

// TODO: maninak fix importing issue "Cannot read properties of undefined (reading 'default')"
// No matter how I import lodash it seems to be undefined?!

/**
 * Constructs a function memoized by its stringified first param and a debounced function
 * clearing its cache.
 *
 * Handy to optimize successive calls of expensive functions with frequently repeating params,
 * which should not be memoized for long e.g. because they aren't pure and we can't
 * know exactly when their dependencies will change to reactively invalidate our cache.
 *
 * The first argument of the original function is coerced to a string and used as
 * the cache key.
 *
 * @example
 * ```
 * function greet(receiver: string) {
 *   return `Hello, ${receiver}!`
 * }
 *
 * const memoizedGreet = memoizeWithDebouncedCacheClear(greet, 10_000)
 * memoizedGreet('World') // Hello, World!
 * ```
 *
 * @param func The function to memoize
 * @param {number} [cacheTtlMs=0] The minimum amount of time to wait in milliseconds
 * after the last time a cache clear was requested, before it actually happens
 * @returns The original function now memoized
 */
// eslint-disable-next-line space-before-function-paren, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
export function memoizeWithDebouncedCacheClear<T extends (...args: any) => unknown>(
  func: T,
  cacheTtlMs = 0,
) {
  const memoizedFunc = memoize(func)
  const debouncedClearMemoizedFuncCache = debounce(
    () => memoizedFunc.cache.clear?.(),
    cacheTtlMs,
  )

  function memoizedFuncWithDebouncedCacheClear(...args: Parameters<T>): ReturnType<T> {
    debouncedClearMemoizedFuncCache()

    return memoizedFunc(args) as ReturnType<T>
  }

  return memoizedFuncWithDebouncedCacheClear
}
