/**
 * Every key of `T` made required, values keeping their `| undefined`.
 *
 * A builder typed with it has to mention every field of the shape it
 * produces, so adding a field to the vocabulary fails the build in each
 * producer until it either maps something onto it or states `undefined` on
 * purpose. `omitUndefined` then drops the absent ones, leaving the sparse
 * entity the resolvers promise.
 */
export type Exhaustive<T> = { [K in keyof Required<T>]: T[K] }
