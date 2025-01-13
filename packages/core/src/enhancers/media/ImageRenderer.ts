import { EMPTY, from, fromEvent, map, of, switchMap, tap } from "rxjs"
import { DocumentRenderer } from "../../spineItem/renderer/DocumentRenderer"

export class ImageRenderer extends DocumentRenderer {
  private getImageElement() {
    const element = this.layers[0]?.element

    if (!(element instanceof HTMLImageElement)) return undefined

    return element
  }

  onCreateDocument() {
    return from(this.resourcesHandler.getResource()).pipe(
      switchMap((responseOrUrl) => {
        const imgElement =
          this.containerElement.ownerDocument.createElement(`img`)

        this.layers = [{ element: imgElement }]

        imgElement.style.objectFit = `contain`
        imgElement.style.userSelect = `none`

        if (responseOrUrl instanceof URL) {
          return of(responseOrUrl.href)
        }
        if (responseOrUrl instanceof Response) {
          return from(responseOrUrl.blob()).pipe(
            map((blob) => {
              return URL.createObjectURL(blob)
            }),
          )
        }

        throw new Error(`Invalid resource`)
      }),
      tap((src) => {
        const element = this.getImageElement()

        if (element) {
          element.src = src
        }
      }),
    )
  }

  onLoadDocument() {
    const imageElement = this.getImageElement()

    if (!imageElement) throw new Error(`invalid element`)

    this.containerElement.appendChild(imageElement)

    return fromEvent(imageElement, `load`)
  }

  onUnload() {
    const imageElement = this.getImageElement()

    if (imageElement) {
      URL.revokeObjectURL(imageElement.src)
    }

    this.layers.forEach(({ element }) => {
      element.remove()
    })

    this.layers = []

    return EMPTY
  }

  onLayout({
    spreadPosition,
  }: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    const element = this.getImageElement()
    const { height: pageHeight, width: pageWidth } = this.context.getPageSize()

    let height = pageHeight

    const width = pageWidth

    if (!element) return of(undefined)

    const naturalWidth = element.naturalWidth || 1
    const naturalHeight = element.naturalHeight || 1
    const ratio = naturalWidth / naturalHeight

    /**
     * In case of continous scroll, we scale up/down the height
     * to match the page width.
     */
    if (
      this.settings.values.computedPageTurnDirection === "vertical" &&
      this.settings.values.computedPageTurnMode === "scrollable" &&
      !this.context.state.isUsingSpreadMode
    ) {
      height = Math.ceil(pageWidth / ratio)
    }

    element.style.height = `${height}px`
    element.style.width = `${width}px`
    element.style.objectPosition =
      spreadPosition === "left"
        ? `right`
        : spreadPosition === `right`
          ? `left`
          : `center`

    return of({
      width,
      height,
    })
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    return undefined
  }
}
