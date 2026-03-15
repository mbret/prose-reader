import { getFrameViewportInfo } from "../../../utils/frames"

export const getViewPortInformation = ({
  pageHeight,
  pageWidth,
  frameElement,
}: {
  pageWidth: number
  pageHeight: number
  frameElement: HTMLIFrameElement
}) => {
  const rawViewportDimensions = getFrameViewportInfo(frameElement)

  let resolvedViewportWidth = rawViewportDimensions.width
  let resolvedViewportHeight = rawViewportDimensions.height

  if (
    !resolvedViewportWidth &&
    rawViewportDimensions.widthToken === `device-width`
  ) {
    resolvedViewportWidth = pageWidth
  }

  if (
    !resolvedViewportHeight &&
    rawViewportDimensions.heightToken === `device-height`
  ) {
    resolvedViewportHeight = pageHeight
  }

  if (
    !resolvedViewportHeight &&
    (resolvedViewportWidth ||
      rawViewportDimensions.widthToken === `device-width`)
  ) {
    resolvedViewportHeight = pageHeight
  }

  if (
    !resolvedViewportWidth &&
    (resolvedViewportHeight ||
      rawViewportDimensions.heightToken === `device-height`)
  ) {
    resolvedViewportWidth = pageWidth
  }

  const resolvedViewportDimensions =
    rawViewportDimensions.hasViewport &&
    resolvedViewportWidth &&
    resolvedViewportHeight
      ? {
          ...rawViewportDimensions,
          width: resolvedViewportWidth,
          height: resolvedViewportHeight,
        }
      : rawViewportDimensions

  if (
    frameElement?.contentDocument &&
    frameElement.contentWindow &&
    resolvedViewportDimensions
  ) {
    const computedWidthScale =
      pageWidth / (resolvedViewportDimensions.width ?? 1)
    const computedScale = Math.min(
      computedWidthScale,
      pageHeight / (resolvedViewportDimensions.height ?? 1),
    )

    return {
      computedScale,
      computedWidthScale,
      viewportDimensions: resolvedViewportDimensions,
    }
  }
}
