/**
 * Asserts that the code is unreachable.
 *
 * If the the call of this function is available to the code execution path,
 * typescript will error out.
 *
 * Commonly used to leverage TypeScript in enforcing that all possible values of the switched
 * variable are handled in a switch-case statement.
 *
 * Example:
 * ```
  type Letter: 'a' | 'b' | 'c'

  switch (myLetter: Letter) {
    case: 'a': doSomething(); break
    case: 'b': doSomethingElse(); break
    default: assertUnreachable(myLetter)
    // Error: Argument of type 'string' is not assignable to parameter of type 'never'.
  }
  ```
 * @param {never} x - never
 * @throws Every time it is called.
 */
export function assertUnreachable(x: never): never {
  throw new Error(`Execution reached no man's land for value ${x}.`)
}

/**
 * Asserts that the value passed will be defined at runtime.
 *
 * Best suited to let TypeScript know that an otherwise optional value is actually
 * expected to be always defined at this point of the execution and onwards.
 *
 * Should be used as a last resort tool when inference cannot be otherwise leveraged for TS to
 * reach the same conclusion and as a better alternative to a type assertion (a.k.a. `as`).
 *
 * @example
 * ```ts
 * const maybeValue: string | undefined = getValue()
 * assertIsDefined(maybeValue)
 * // henceforth `maybeValue` is of type "string" as far as TS is concerned
 * ```
 */
export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error("Value was expected to be defined but wasn't")
  }
}
