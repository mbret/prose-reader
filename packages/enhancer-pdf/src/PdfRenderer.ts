import { EMPTY, from, Observable, switchMap } from "rxjs"
import { PDFPageProxy, RenderingCancelledException, RenderTask } from "pdfjs-dist"
import { DocumentRenderer } from "@prose-reader/core"

export class PdfRenderer extends DocumentRenderer {
  private pageProxy: PDFPageProxy | undefined
  private renderTask: RenderTask | undefined

  getCanvas() {
    const element = this.layers[0]?.element.children[0]

    if (element instanceof HTMLCanvasElement) return element

    return undefined
  }

  onUnload(): Observable<unknown> {
    this.layers.forEach(({ element }) => {
      element.remove()
    })

    this.layers = []

    this.pageProxy?.cleanup()

    return EMPTY
  }

  onCreateDocument(): Observable<unknown> {
    const canvasContainer = this.containerElement.ownerDocument.createElement(`div`)
    canvasContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    `

    const canvas = this.containerElement.ownerDocument.createElement(`canvas`)

    canvasContainer.appendChild(canvas)

    this.layers = [
      {
        element: canvasContainer,
      },
    ]

    return EMPTY
  }

  onLoadDocument(): Observable<unknown> {
    return from(this.resourcesHandler.fetchResource()).pipe(
      switchMap((resource) => {
        if (!("custom" in resource)) return EMPTY

        const pageProxy = resource.data as PDFPageProxy

        this.pageProxy = pageProxy

        const container = this.layers[0]?.element

        if (container) {
          this.containerElement.appendChild(container)
        }

        return EMPTY
      }),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layout(_: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }): { width: number; height: number } | undefined {
    const canvas = this.getCanvas()
    const context = canvas?.getContext("2d")
    // Support HiDPI-screens.
    const pixelRatioScale = window.devicePixelRatio || 1

    if (!canvas || !this.pageProxy || !context) return undefined

    // first we try to get the desired viewport for a confortable reading based on theh current page size
    const { height: pageHeight, width: pageWidth } = this.context.getPageSize()
    const { width: viewportWidth, height: viewportHeight } = this.pageProxy.getViewport({ scale: 1 })
    const pageScale = Math.max(pageWidth / viewportWidth, pageHeight / viewportHeight)

    // then we generate the viewport for the canvas based on the page scale
    const viewport = this.pageProxy.getViewport({ scale: pageScale })

    // Then wedefine which axis should stretch or shrink to ratio
    const viewportRatio = viewport.width / viewport.height
    const pageRatio = pageWidth / pageHeight
    const isWiderThanPage = viewportRatio > pageRatio
    const canvasWidth = isWiderThanPage ? pageWidth : pageHeight * viewportRatio
    const canvasHeight = viewportRatio > pageRatio ? pageWidth / viewportRatio : pageHeight

    canvas.width = Math.floor(viewport.width * pixelRatioScale)
    canvas.height = Math.floor(viewport.height * pixelRatioScale)
    canvas.style.width = Math.floor(canvasWidth) + "px"
    canvas.style.height = Math.floor(canvasHeight) + "px"

    if (this.renderTask) {
      this.renderTask.cancel()
    }

    const transform = pixelRatioScale !== 1 ? [pixelRatioScale, 0, 0, pixelRatioScale, 0, 0] : null

    this.renderTask = this.pageProxy?.render({
      ...(transform && { transform }),
      canvasContext: context,
      viewport,
    })

    this.renderTask?.promise
      .catch((e) => {
        if (!(e instanceof RenderingCancelledException)) console.error(e)
      })
      .finally(() => {
        this.renderTask = undefined
      })

    return undefined
  }
}
