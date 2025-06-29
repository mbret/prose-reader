import type { Reader } from "@prose-reader/core"
import type { PDFPageProxy } from "pdfjs-dist"

export const layoutContainer = (
  container: HTMLElement | undefined,
  context: Reader["context"],
  spreadPosition: `none` | `left` | `right`,
) => {
  if (!container) return

  // first we try to get the desired viewport for a comfortable reading based on theh current page size
  const { height: pageHeight, width: pageWidth } = context.getPageSize()

  container.style.width = `${pageWidth}px`
  container.style.height = `${pageHeight}px`

  if (spreadPosition === `right`) {
    container.style.justifyContent = `flex-start`
  } else if (spreadPosition === `left`) {
    container.style.justifyContent = `flex-end`
  } else {
    container.style.justifyContent = `center`
  }
}

export const layoutCanvas = (
  pageProxy: PDFPageProxy,
  canvas: HTMLCanvasElement,
  context: Reader["context"],
) => {
  // Support HiDPI-screens.
  const pixelRatioScale = window.devicePixelRatio || 1
  const { height: pageHeight, width: pageWidth } = context.getPageSize()
  const { width: viewportWidth, height: viewportHeight } =
    pageProxy.getViewport({ scale: 1 })
  const pageScale = Math.max(
    pageWidth / viewportWidth,
    pageHeight / viewportHeight,
  )

  // then we generate the viewport for the canvas based on the page scale
  const viewport = pageProxy.getViewport({ scale: pageScale })

  // Then we define which axis should stretch or shrink to ratio
  const viewportRatio = viewport.width / viewport.height
  const pageRatio = pageWidth / pageHeight
  const isWiderThanPage = viewportRatio > pageRatio
  const canvasWidth = isWiderThanPage ? pageWidth : pageHeight * viewportRatio
  const canvasHeight =
    viewportRatio > pageRatio ? pageWidth / viewportRatio : pageHeight

  canvas.width = Math.floor(viewport.width * pixelRatioScale)
  canvas.height = Math.floor(viewport.height * pixelRatioScale)
  canvas.style.width = `${Math.floor(canvasWidth)}px`
  canvas.style.height = `${Math.floor(canvasHeight)}px`
}
