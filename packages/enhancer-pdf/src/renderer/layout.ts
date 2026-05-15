import {
  setPropertyIfChanged,
  setStylePropertyIfChanged,
  type Viewport,
} from "@prose-reader/core"
import type { PDFPageProxy } from "pdfjs-dist"

export const layoutContainer = (
  container: HTMLElement | undefined,
  spreadPosition: `none` | `left` | `right`,
  viewport: Viewport,
) => {
  if (!container) return

  // first we try to get the desired viewport for a comfortable reading based on theh current page size
  const { height: pageHeight, width: pageWidth } = viewport.pageSize

  setStylePropertyIfChanged(container.style, `width`, `${pageWidth}px`)
  setStylePropertyIfChanged(container.style, `height`, `${pageHeight}px`)

  if (spreadPosition === `right`) {
    setStylePropertyIfChanged(container.style, `justify-content`, `flex-start`)
  } else if (spreadPosition === `left`) {
    setStylePropertyIfChanged(container.style, `justify-content`, `flex-end`)
  } else {
    setStylePropertyIfChanged(container.style, `justify-content`, `center`)
  }
}

export const layoutCanvas = (
  pageProxy: PDFPageProxy,
  canvas: HTMLCanvasElement,
  readerViewport: Viewport,
) => {
  // Support HiDPI-screens.
  const pixelRatioScale = window.devicePixelRatio || 1
  const { height: pageHeight, width: pageWidth } = readerViewport.pageSize
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

  setPropertyIfChanged(
    canvas,
    `width`,
    Math.floor(viewport.width * pixelRatioScale),
  )
  setPropertyIfChanged(
    canvas,
    `height`,
    Math.floor(viewport.height * pixelRatioScale),
  )
  setStylePropertyIfChanged(
    canvas.style,
    `width`,
    `${Math.floor(canvasWidth)}px`,
  )
  setStylePropertyIfChanged(
    canvas.style,
    `height`,
    `${Math.floor(canvasHeight)}px`,
  )
}
