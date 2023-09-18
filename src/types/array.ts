type BuildArrayMinLength<
  T,
  N extends number,
  Current extends T[],
> = Current['length'] extends N
  ? [...Current, ...T[]]
  : BuildArrayMinLength<T, N, [...Current, T]>

/**
 * Enforces an array of type `T` to be set with _at least_ `N` count of items
 *
 * @example
 * ```ts
 * const arr1: ArrayMinLength<number, 2> = [1] // Type '[number]' is not assignable to type '[number, number, ...number[]]'. Source has 1 element(s) but target requires 2.
 * const arr2: ArrayMinLength<number, 2> = [1, 2] // OK
 * const arr3: ArrayMinLength<number, 2> = [1, 2, 3] // OK
 * ```
 */
export type ArrayMinLength<T, N extends number> = BuildArrayMinLength<T, N, []>

/**
 * Enforces an array of type `T` to be set with _exactly_ `N` count of items
 *
 * @example
 * ```ts
 * const arr1: ArrayFixedLength<number, 2> = [1] // Error: Type '[]' is not assignable to type 'readonly [number, number]'. Source has 1 element(s) but target requires 2.
 * const arr2: ArrayFixedLength<number, 2> = [1, 2] // OK
 * const arr3: ArrayFixedLength<number, 2> = [1, 2, 3] // Type '[number, number, number]' is not assignable to type 'readonly [number, number]'. Source has 3 element(s) but target allows only 2.
 * ```
 */
export type ArrayFixedLength<
  T,
  N extends number,
  R extends readonly T[] = [],
> = R['length'] extends N ? R : ArrayFixedLength<T, N, readonly [T, ...R]>

/**
 * Extracts the type of items contained in an array.
 *
 * @example
 * ```ts
 * const array = ['a', 1]
 * type MyType = Unarray<typeof array>  // string | number
 * ```
 */
export type Unarray<T> = T extends (infer U)[] ? U : T extends readonly (infer U)[] ? U : T
