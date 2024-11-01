import { EMPTY, from, fromEvent, tap } from "rxjs"
import { Renderer } from "../../spineItem/renderers/Renderer"

export class ImageRenderer extends Renderer {
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

  render({
    spreadPosition,
  }: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    const element = this.getImageElement()

    if (element) {
      element.style.height = `${this.context.getPageSize().height}px`
      element.style.width = `${this.context.getPageSize().width}px`
      element.style.objectPosition =
        spreadPosition === "left"
          ? `right`
          : spreadPosition === `right`
            ? `left`
            : `center`
    }

    return {
      width: 0,
      height: 0,
    }
  }
}
