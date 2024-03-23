import { Manifest } from "@prose-reader/shared"

/**
 * Global spread behavior
 * @see http://idpf.org/epub/fxl/#property-spread
 * @todo user setting
 */
export const isUsingSpreadMode = ({
  manifest,
  visibleAreaRect,
  forceSinglePageMode,
}: {
  manifest: Manifest
  visibleAreaRect: { height: number; width: number }
  forceSinglePageMode?: boolean
}) => {
  const { height, width } = visibleAreaRect
  const isLandscape = width > height

  if (forceSinglePageMode) return false

  /**
   * For now we don't support spread for reflowable & scrollable content since
   * two items could have different height, resulting in weird stuff.
   */
  if (manifest?.renditionFlow === `scrolled-continuous`) return false

  // portrait only
  if (!isLandscape && manifest?.renditionSpread === `portrait`) {
    return true
  }

  // default auto behavior
  return (
    isLandscape &&
    (manifest?.renditionSpread === undefined ||
      manifest?.renditionSpread === `auto` ||
      manifest?.renditionSpread === `landscape` ||
      manifest?.renditionSpread === `both`)
  )
}
