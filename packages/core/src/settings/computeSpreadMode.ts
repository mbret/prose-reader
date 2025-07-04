import type { Manifest } from "@prose-reader/shared"

/**
 * Global spread behavior
 * @see http://idpf.org/epub/fxl/#property-spread
 * @todo user setting
 */
export const computeSpreadMode = ({
  manifest,
  spreadMode,
}: {
  spreadMode: boolean
  manifest?: Manifest
}) => {
  /**
   * For now we don't support spread for reflowable & scrollable content since
   * two items could have different height, resulting in weird stuff.
   */
  if (manifest?.renditionFlow === `scrolled-continuous`) return false

  return spreadMode
}
