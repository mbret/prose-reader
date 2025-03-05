import {
  DocumentRenderer,
  injectCSS,
  removeCSS,
  waitForFrameLoad,
  waitForFrameReady,
  waitForSwitch,
} from "@prose-reader/core"
import {
  type PDFPageProxy,
  type RenderTask,
  RenderingCancelledException,
  TextLayer,
} from "pdfjs-dist"
import {
  EMPTY,
  type Observable,
  catchError,
  finalize,
  from,
  map,
  of,
  switchMap,
  tap,
} from "rxjs"
import pdfFrameStyle from "./frame.css?inline"
import { layoutCanvas, layoutContainer } from "./layout"

export class PdfRenderer extends DocumentRenderer {
  private pageProxy: PDFPageProxy | undefined
  private renderTask: RenderTask | undefined
  private textLayer: TextLayer | undefined

  constructor(
    private pdfViewerStyle: string,
    params: ConstructorParameters<typeof DocumentRenderer>[0],
  ) {
    super(params)
  }

  private getCanvas() {
    const element = this.documentContainer?.children[0]

    if (!(element instanceof HTMLCanvasElement)) return

    return element
  }

  private getFrameElement() {
    const frame = this.documentContainer?.children[1].children[0]

    if (!(frame instanceof HTMLIFrameElement)) return

    return frame
  }

  private getPageProxy() {
    if (this.pageProxy) return of(this.pageProxy)

    return from(this.resourcesHandler.fetchResource()).pipe(
      switchMap((resource) => {
        if (!("custom" in resource)) return EMPTY

        this.pageProxy = resource.data as PDFPageProxy

        return of(this.pageProxy)
      }),
    )
  }

  onUnload(): Observable<unknown> {
    this.detach()

    if (this.renderTask) {
      this.renderTask.cancel()
    }

    this.textLayer?.cancel()
    this.pageProxy?.cleanup()

    return EMPTY
  }

  onCreateDocument(): Observable<HTMLElement> {
    const frameElement = document.createElement(`iframe`)
    frameElement.style.cssText = `
      overflow: hidden;
      height: 100%;
      width: 100%;
    `

    frameElement.setAttribute("tabIndex", "0")
    frameElement.setAttribute("frameBorder", "0")
    frameElement.setAttribute(`src`, "about:blank")

    const frameContainer =
      this.containerElement.ownerDocument.createElement("div")
    frameContainer.style.cssText = `
      mix-blend-mode: multiply;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      position: absolute;
      height: 100%;
      width: 100%;
      top: 0;
    `

    /**
     * The canvas is never attached to the DOM and will be used for offscreen rendering
     * then copied into the frame.
     */
    const canvas = this.containerElement.ownerDocument.createElement("canvas")

    frameContainer.appendChild(frameElement)

    const rootElement = this.containerElement.ownerDocument.createElement(`div`)
    rootElement.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
    `

    rootElement.appendChild(canvas)
    rootElement.appendChild(frameContainer)

    this.setDocumentContainer(rootElement)

    return of(rootElement)
  }

  onLoadDocument(): Observable<unknown> {
    return this.getPageProxy().pipe(
      switchMap(() => {
        const frameElement = this.getFrameElement()

        if (!frameElement) return EMPTY

        return of(frameElement).pipe(
          waitForSwitch(this.context.bridgeEvent.viewportFree$),
          tap(() => {
            this.attach()
          }),
          waitForFrameLoad,
          tap(() => {
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

  onLayout({
    spreadPosition,
  }: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    const frameElement = this.getFrameElement()
    const canvas = this.getCanvas()

    if (!frameElement || !canvas) return of(undefined)

    // first we try to get the desired viewport for a confortable reading based on theh current page size
    const { height: pageHeight, width: pageWidth } = this.context.getPageSize()

    layoutContainer(this.documentContainer, this.context, spreadPosition)

    const context = canvas?.getContext("2d")
    // Support HiDPI-screens.
    const pixelRatioScale = window.devicePixelRatio || 1

    if (!this.pageProxy || !context) return of(undefined)

    if (this.renderTask) {
      this.renderTask.cancel()
      this.renderTask = undefined
    }

    layoutCanvas(this.pageProxy, canvas, this.context)

    const { width: viewportWidth, height: viewportHeight } =
      this.pageProxy.getViewport({ scale: 1 })
    const pageScale = Math.max(
      pageWidth / viewportWidth,
      pageHeight / viewportHeight,
    )

    // then we generate the viewport for the canvas based on the page scale
    const viewport = this.pageProxy.getViewport({ scale: pageScale })

    const transform =
      pixelRatioScale !== 1
        ? [pixelRatioScale, 0, 0, pixelRatioScale, 0, 0]
        : null

    this.renderTask = this.pageProxy?.render({
      ...(transform && { transform }),
      canvasContext: context,
      viewport,
    })

    return from(this.renderTask?.promise).pipe(
      map(() => {
        const frameDoc = frameElement?.contentDocument

        if (!frameDoc || !frameElement) {
          return undefined
        }

        frameDoc.body.innerHTML = ``

        // const frameCanvas = copyCanvasToFrame(canvas, frameDoc)
        const pdfPage = this.pageProxy

        if (!pdfPage) return undefined

        const textLayerElement = frameDoc.createElement(`div`)
        // Set it's class to textLayer which have required CSS styles
        textLayerElement.setAttribute("class", "textLayer")
        frameDoc.body.appendChild(textLayerElement)

        const canvasScale = canvas.clientWidth / viewportWidth

        textLayerElement.style.top = `${canvas.offsetTop}px`
        textLayerElement.style.left = `${canvas.offsetLeft}px`
        textLayerElement.style.height = canvas.style.height
        textLayerElement.style.width = canvas.style.width

        removeCSS(frameElement, "pdf-scale-scale")
        injectCSS(
          frameElement,
          "pdf-scale-scale",
          `:root { --scale-factor: ${canvasScale}; }`,
        )

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
      }),
    )
  }

  /**
   * @important
   * We should keep the same node structure to preserve CFI integrity.
   */
  onRenderHeadless() {
    return this.getPageProxy().pipe(
      switchMap((pageProxy) => {
        const headlessDocument = document.implementation.createHTMLDocument()
        const textLayerElement = headlessDocument.createElement("div")

        headlessDocument.body.appendChild(textLayerElement)

        const textLayer = new TextLayer({
          container: textLayerElement,
          textContentSource: pageProxy.streamTextContent(),
          viewport: pageProxy.getViewport({ scale: 1 }),
        })

        return from(textLayer.render()).pipe(map(() => headlessDocument))
      }),
    )
  }

  getDocumentFrame() {
    return this.getFrameElement()
  }
}
