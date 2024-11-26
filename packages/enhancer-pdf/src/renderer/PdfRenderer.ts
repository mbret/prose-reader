import { catchError, EMPTY, finalize, from, map, Observable, of, switchMap, tap } from "rxjs"
import { PDFPageProxy, RenderingCancelledException, RenderTask, TextLayer } from "pdfjs-dist"
import { DocumentRenderer, injectCSS, removeCSS, waitForFrameReady, waitForSwitch } from "@prose-reader/core"
import { copyCanvasToFrame, createPdfFrameElement } from "./frames"
import pdfFrameStyle from "./frame.css?inline"

export class PdfRenderer extends DocumentRenderer {
  private pageProxy: PDFPageProxy | undefined
  private renderTask: RenderTask | undefined
  private textLayer: TextLayer | undefined
  private getFrameElement() {
    const frame = this.layers[0]?.element

    if (!(frame instanceof HTMLIFrameElement)) return

    return frame
  }

  constructor(
    private pdfViewerStyle: string,
    params: ConstructorParameters<typeof DocumentRenderer>[0],
  ) {
    super(params)
  }

  onUnload(): Observable<unknown> {
    this.layers.forEach(({ element }) => {
      element.remove()
    })

    this.layers = []

    if (this.renderTask) {
      this.renderTask.cancel()
    }
    this.textLayer?.cancel()
    this.pageProxy?.cleanup()

    return EMPTY
  }

  onCreateDocument(): Observable<unknown> {
    const frameElement = createPdfFrameElement()

    frameElement.setAttribute(`src`, "about:blank")

    this.layers = [
      {
        element: frameElement,
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

        const frameElement = this.getFrameElement()

        if (!frameElement) return EMPTY

        return of(frameElement).pipe(
          waitForSwitch(this.context.bridgeEvent.viewportFree$),
          tap(() => {
            this.containerElement.appendChild(frameElement)
            // frame will instantly load, no need to wait for event

            injectCSS(frameElement, "pdfjs-viewer-style", this.pdfViewerStyle)
            injectCSS(frameElement, "enhancer-pdf-style", pdfFrameStyle)

            const body = frameElement?.contentDocument?.body

            if (body) {
              const canvas = body.ownerDocument.createElement(`canvas`)

              body.appendChild(canvas)
            }
          }),
          waitForFrameReady,
        )
      }),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLayout(_: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    const frameElement = this.getFrameElement()

    if (!frameElement) return of(undefined)

    /**
     * The canvas is never attached to the DOM and will be used for offscreen rendering
     * then copied into the frame.
     */
    const canvas = this.containerElement.ownerDocument.createElement("canvas")
    const context = canvas?.getContext("2d")
    // Support HiDPI-screens.
    const pixelRatioScale = window.devicePixelRatio || 1

    if (!this.pageProxy || !context) return of(undefined)

    if (this.renderTask) {
      this.renderTask.cancel()
      this.renderTask = undefined
    }

    // first we try to get the desired viewport for a confortable reading based on theh current page size
    const { height: pageHeight, width: pageWidth } = this.context.getPageSize()

    frameElement.style.height = `${pageHeight}px`
    frameElement.style.width = `${pageWidth}px`

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

    const transform = pixelRatioScale !== 1 ? [pixelRatioScale, 0, 0, pixelRatioScale, 0, 0] : null

    this.renderTask = this.pageProxy?.render({
      ...(transform && { transform }),
      canvasContext: context,
      viewport,
    })

    return from(this.renderTask?.promise).pipe(
      map(() => {
        const frameElement = this.getFrameElement()
        const frameDoc = frameElement?.contentDocument

        if (!frameDoc || !frameElement) {
          return undefined
        }

        frameDoc.body.innerHTML = ``

        const frameCanvas = copyCanvasToFrame(canvas, frameDoc)
        const pdfPage = this.pageProxy

        if (!pdfPage) return undefined

        const textLayerElement = frameDoc.createElement(`div`)
        // Set it's class to textLayer which have required CSS styles
        textLayerElement.setAttribute("class", "textLayer")
        frameDoc.body.appendChild(textLayerElement)
        // scale between original viewport size and the rendererd canvas size. (not the rendering scale)
        const canvasScale = canvasWidth / viewportWidth
        textLayerElement.style.top = frameCanvas.offsetTop + "px"
        textLayerElement.style.left = frameCanvas.offsetLeft + "px"

        removeCSS(frameElement, "pdf-scale-scale")
        injectCSS(frameElement, "pdf-scale-scale", `:root { --scale-factor: ${canvasScale}; }`)

        if (this.textLayer) {
          this.textLayer.cancel()
        }

        this.textLayer = new TextLayer({
          container: textLayerElement,
          textContentSource: pdfPage.streamTextContent(),
          viewport,
        })

        return from(this.textLayer.render())
      }),
      map(() => undefined),
      catchError((e) => {
        if (!(e instanceof RenderingCancelledException)) console.error(e)

        return of(undefined)
      }),
      finalize(() => {
        this.renderTask = undefined

        canvas.remove()
      }),
    )
  }
}
