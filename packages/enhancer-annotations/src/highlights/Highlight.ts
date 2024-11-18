import { DestroyableClass, Reader, SpineItem } from "@prose-reader/core"
import { RuntimeHighlight } from "../types"
import { getElementsForRange, getRangeFromSelection } from "./utils"
import { report } from "../report"

export class Highlight extends DestroyableClass {
  private container: HTMLElement

  constructor(
    private spineItem: SpineItem,
    private containerElement: HTMLElement,
    private reader: Reader,
    public readonly annotation: RuntimeHighlight,
  ) {
    super()

    void this.spineItem

    this.container = this.containerElement.ownerDocument.createElement("div")

    this.render()
  }

  public render() {
    this.container.innerHTML = ""

    const { node: anchorNode, offset: anchorOffset } = this.reader.cfi.resolveCfi({ cfi: this.annotation.anchorCfi ?? `` }) ?? {}
    const { node: focusNode, offset: focusOffset } = this.reader.cfi.resolveCfi({ cfi: this.annotation.focusCfi ?? `` }) ?? {}

    if (!anchorNode || !focusNode) {
      report.error(`Unable to resolve anchor cfi: ${this.annotation.anchorCfi}`)

      return
    }

    const range = getRangeFromSelection(
      this.containerElement,
      { node: anchorNode, offset: anchorOffset },
      { node: focusNode, offset: focusOffset },
    )

    const rectElements = getElementsForRange(range, this.container)

    rectElements.forEach((elt) => {
      elt.style.pointerEvents = "initial"
      elt.style.cursor = "pointer"

      this.container.appendChild(elt)
    })

    this.containerElement.appendChild(this.container)
  }

  isWithinTarget(target: Node) {
    return this.container.contains(target)
  }

  public destroy() {
    super.destroy()

    this.container.remove()
  }
}
