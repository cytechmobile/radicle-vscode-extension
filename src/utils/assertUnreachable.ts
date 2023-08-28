/**
 * Assert that the code is unreachable.
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
    case: 'a': doSomething()
    case: 'b': doSomethingElse()
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
