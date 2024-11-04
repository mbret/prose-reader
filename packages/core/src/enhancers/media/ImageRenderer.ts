import { EMPTY, from, fromEvent, map, of, switchMap, tap } from "rxjs"
import { DocumentRenderer } from "../../spineItem/DocumentRenderer"

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
        } else {
          return from(responseOrUrl.blob()).pipe(
            map((blob) => {
              return URL.createObjectURL(blob)
            }),
          )
        }
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

  layout({
    spreadPosition,
  }: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    const element = this.getImageElement()
    const continuousScrollableReflowableItem =
      this.context.manifest?.renditionLayout === "reflowable" &&
      this.context.manifest?.renditionFlow === "scrolled-continuous"
    const { height: pageHeight, width: pageWidth } = this.context.getPageSize()

    let height = pageHeight
    const width = pageWidth

    if (element) {
      const naturalWidth = element.naturalWidth
      const naturalHeight = element.naturalHeight
      const ratio = naturalWidth / naturalHeight

      /**
       * In case of continous scroll, we scale up/down the height
       * to match the page width.
       */
      if (continuousScrollableReflowableItem) {
        height = pageWidth / ratio
      }

      element.style.height = `${height}px`
      element.style.width = `${width}px`
      element.style.objectPosition =
        spreadPosition === "left"
          ? `right`
          : spreadPosition === `right`
            ? `left`
            : `center`
    }

    return {
      width,
      height,
    }
  }
}