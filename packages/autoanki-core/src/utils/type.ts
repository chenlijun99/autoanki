/**
 * Check if two types are equal
 *
 * Source: https://github.com/microsoft/TypeScript/issues/27024#issuecomment-421529650
 */
// prettier-ignore
export type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false;

/**
 * Type-level assertio
 */
export type AssertTrue<A extends true> = A;
