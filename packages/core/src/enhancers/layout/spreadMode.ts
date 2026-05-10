import type { Manifest } from "@prose-reader/shared"
import { computeSpreadMode } from "../../settings/computeSpreadMode"

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

export const shouldEnableSpreadModeForViewport = ({
  manifest,
  viewport,
}: {
  manifest: Manifest | undefined
  viewport: ViewportDimensions
}) => {
  const isLandscape = viewport.width > viewport.height

  if (!isLandscape && manifest?.renditionSpread === `portrait`) {
    return true
  }

  if (isLandscape && isSpreadEnabledInLandscape(manifest?.renditionSpread)) {
    return true
  }

  return false
}

export const shouldUseComputedSpreadModeForViewport = ({
  manifest,
  viewport,
}: {
  manifest: Manifest | undefined
  viewport: ViewportDimensions
}) => {
  return computeSpreadMode({
    manifest,
    spreadMode: shouldEnableSpreadModeForViewport({ manifest, viewport }),
  })
}
