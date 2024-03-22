import { Reader } from "../reader"

/**
 * Hide some methods by restricting typescript types.
 * This is to reduce confusion on end user and avoid catastrophes
 */
export const publicApiEnhancer = <InheritOptions, InheritOutput extends Reader>(
  next: (options: InheritOptions) => InheritOutput,
) => {
  return (
    options: InheritOptions,
  ): Omit<InheritOutput, "pagination"> & {
    pagination: Pick<InheritOutput["pagination"], "paginationInfo$" | "getPaginationInfo">
  } => {
    const reader = next(options)

    return reader
  }
}
