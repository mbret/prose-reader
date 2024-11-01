import { EMPTY, from, fromEvent, tap } from "rxjs"
import { DocumentRenderer } from "../../spineItem/DocumentRenderer"

export class ImageRenderer extends DocumentRenderer {
  private getImageElement() {
    const element = this.layers[0]?.element

    if (!(element instanceof HTMLImageElement)) return undefined

    return element
  }

  onCreateDocument() {
    return from(this.resourcesHandler.getResource()).pipe(
      tap((responseOrUrl) => {
        const imgElement =
          this.containerElement.ownerDocument.createElement(`img`)

        imgElement.style.objectFit = `contain`

        if (responseOrUrl instanceof URL) {
          imgElement.src = responseOrUrl.href
        }

        this.layers = [{ element: imgElement }]
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
