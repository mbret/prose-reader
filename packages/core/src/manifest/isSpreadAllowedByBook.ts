import type { Manifest } from "@prose-reader/shared"

/**
 * Whether the book can be shown in a spread at all, in some viewport and for
 * some `spreadMode`. When it cannot, the setting changes nothing for it.
 */
export const isSpreadAllowedByBook = (manifest: Manifest) => {
  /**
   * For now we don't support spread for reflowable & scrollable content since
   * two items could have different height, resulting in weird stuff.
   */
  if (manifest.renditionFlow === `scrolled-continuous`) return false

  /**
   * A book that asks for no spread is never shown in one, whatever the
   * setting: reading systems must not incorporate its items in a synthetic
   * spread.
   *
   * @see https://www.w3.org/TR/epub-rs-33/#spread
   */
  return manifest.renditionSpread !== `none`
}
