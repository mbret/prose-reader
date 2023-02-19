/**
 * Represent a position coordinate relative the global viewport.
 * Not to be confused with SpineItemPosition.
 */
export type SpinePosition = {
  x: number
  y: number
  __symbol?: `SpinePosition`
}

export type UnsafeSpinePosition = {
  x: number
  y: number
  __symbol?: `UnsafeSpinePosition` | `SpinePosition`
}
