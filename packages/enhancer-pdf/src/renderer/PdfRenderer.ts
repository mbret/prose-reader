import {
  DocumentRenderer,
  injectCSSToFrame,
  removeCSS,
  waitForFrameLoad,
  waitForFrameReady,
  waitForSwitch,
} from "@prose-reader/core"
import {
  type PDFPageProxy,
  RenderingCancelledException,
  type RenderTask,
  TextLayer,
} from "pdfjs-dist"
import {
  catchError,
  EMPTY,
  finalize,
  from,
  map,
  type Observable,
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
        const pageProxy = this.pageProxy

        if (!frameElement || !pageProxy) return EMPTY

        return of(frameElement).pipe(
          waitForSwitch(this.context.bridgeEvent.viewportFree$),
          tap(() => {
            this.attach()
          }),
          waitForFrameLoad,
          switchMap(() => {
            injectCSSToFrame(
              frameElement,
              "pdfjs-viewer-style",
              this.pdfViewerStyle,
            )
            injectCSSToFrame(frameElement, "enhancer-pdf-style", pdfFrameStyle)

            /**
             * We make sure to render the text layer to simulate the document being loaded.
             * It will be correctly re-layout later. Consumers looking for document load have at least
             * the actual text document ready. (cfi lookup, etc.)
             */
            const frameBody = frameElement.contentDocument?.body

            if (!frameBody || !this.pageProxy) return EMPTY

            frameBody.setAttribute("class", "textLayer")

            this.textLayer = new TextLayer({
              container: frameBody,
              textContentSource: this.pageProxy.streamTextContent(),
              viewport: this.pageProxy.getViewport({ scale: 1 }),
            })

            return from(this.textLayer.render())
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

    // first we try to get the desired viewport for a comfortable reading based on the current page size
    const { height: pageHeight, width: pageWidth } = this.viewport.pageSize

    layoutContainer(this.documentContainer, spreadPosition, this.viewport)

    const context = canvas.getContext("2d")
    // Support HiDPI-screens.
    const pixelRatioScale = window.devicePixelRatio || 1

    if (!this.pageProxy || !context) return of(undefined)

    if (this.renderTask) {
      this.renderTask.cancel()
      this.renderTask = undefined
    }

    layoutCanvas(this.pageProxy, canvas, this.viewport)

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

    this.renderTask = this.pageProxy.render({
      ...(transform && { transform }),
      canvasContext: context,
      viewport,
      canvas,
    })

    return from(this.renderTask.promise).pipe(
      switchMap(() => {
        const frameDoc = frameElement?.contentDocument
        const pdfPage = this.pageProxy

        if (!frameDoc || !frameElement || !pdfPage || !this.textLayer) {
          throw new Error("Unable to update text layer due to missing elements")
        }

        const textLayerElement = frameDoc.body
        const canvasScale = canvas.clientWidth / viewportWidth

        textLayerElement.style.top = `${canvas.offsetTop}px`
        textLayerElement.style.left = `${canvas.offsetLeft}px`
        textLayerElement.style.height = canvas.style.height
        textLayerElement.style.width = canvas.style.width

        removeCSS(frameElement, "pdf-scale-scale")
        /**
         * Taking inspiration from https://github.com/mozilla/pdf.js/blob/master/web/pdf_viewer.css.
         * Not sure why pdfjs DOES rely on css from the viewer to works. Or in another words, why is it
         * not more obvious that TextLayer requires a set of variables to work correctly.
         */
        injectCSSToFrame(
          frameElement,
          "pdf-scale-scale",
          `:root {
            --scale-factor: ${canvasScale};
            --user-unit: 1; 
            --total-scale-factor: calc(var(--scale-factor) * var(--user-unit));
            --scale-round-x: 1px;
            --scale-round-y: 1px;
           }`,
        )

        this.textLayer.update({
          viewport,
        })

        return of(undefined)
      }),
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
        const textLayerElement = headlessDocument.body

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
