/**
 * Represent a position coordinate relative to an item (not the global viewport).
 * Not to be confused with SpinePosition.
 */
export type SpineItemPosition = {
  x: number
  y: number
  __symbol?: `SpineItemPosition`
}

export type UnsafeSpineItemPosition = {
  x: number
  y: number
  __symbol?: `UnsafeSpineItemPosition`
}
