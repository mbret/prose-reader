import { EMPTY, from, Observable, switchMap } from "rxjs"
import {
  PDFPageProxy,
  RenderingCancelledException,
  RenderTask,
} from "pdfjs-dist"
import { DocumentRenderer } from "@prose-reader/core"

export class PdfRenderer extends DocumentRenderer {
  private pageProxy: PDFPageProxy | undefined
  private renderTask: RenderTask | undefined

  getCanvas() {
    const element = this.layers[0]?.element

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
    const canvas = this.containerElement.ownerDocument.createElement(`canvas`)

    this.layers = [
      {
        element: canvas,
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

        const canvas = this.getCanvas()

        if (canvas) {
          this.containerElement.appendChild(canvas)
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

    if (!canvas || !this.pageProxy || !context) return undefined

    const { height, width } = this.context.getPageSize()

    canvas.width = width
    canvas.height = height
    canvas.style.width = Math.floor(width) + "px"
    canvas.style.height = Math.floor(height) + "px"

    const viewport = this.pageProxy.getViewport({ scale: 1 })
    const scale = Math.min(width / viewport.width, height / viewport.height)
    const scaledViewport = this.pageProxy.getViewport({ scale: scale })

    if (this.renderTask) {
      this.renderTask.cancel()
    }

    this.renderTask = this.pageProxy?.render({
      canvasContext: context,
      viewport: scaledViewport,
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
