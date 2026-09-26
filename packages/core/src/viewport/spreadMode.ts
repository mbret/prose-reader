import type { Manifest } from "@prose-reader/shared"
import { isSpreadAllowedByBook } from "../manifest/isSpreadAllowedByBook"
import type { CoreInputSettings } from "../settings/types"

type ViewportDimensions = {
  height: number
  width: number
}

const isSpreadEnabledInLandscape = (
  renditionSpread: Manifest["renditionSpread"],
) => {
  return (
    renditionSpread === undefined ||
    renditionSpread === `auto` ||
    renditionSpread === `landscape` ||
    renditionSpread === `both`
  )
}

/**
 * Whether a viewport of this size shows two pages side by side, for the given
 * `spreadMode` setting. The setting only decides within what the book allows.
 * The viewport decides it in the same measurement as its size, so the two
 * never disagree.
 *
 * @see http://idpf.org/epub/fxl/#property-spread
 */
export const shouldUseSpreadModeForViewport = ({
  spreadMode,
  manifest,
  viewport,
}: {
  spreadMode: CoreInputSettings["spreadMode"]
  manifest: Manifest
  viewport: ViewportDimensions
}) => {
  if (!isSpreadAllowedByBook(manifest)) return false

  if (spreadMode !== `auto`) return spreadMode === `always`

  const isLandscape = viewport.width > viewport.height

  if (!isLandscape) return manifest.renditionSpread === `portrait`

  return isSpreadEnabledInLandscape(manifest.renditionSpread)
}
