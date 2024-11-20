import { DestroyableClass, Reader, SpineItem } from "@prose-reader/core"
import { RuntimeHighlight } from "../types"
import { getElementsForRange, getRangeFromSelection } from "./utils"
import { report } from "../report"
import { fromEvent, map, Observable, share, skip, takeUntil, tap } from "rxjs"

export class SpineItemHighlight extends DestroyableClass {
  private container: HTMLElement

  public readonly tap$: Observable<{ event: Event; highlight: RuntimeHighlight }>

  constructor(
    private spineItem: SpineItem,
    private containerElement: HTMLElement,
    private reader: Reader,
    public readonly highlight: RuntimeHighlight,
    private isSelected: Observable<boolean>,
  ) {
    super()

    void this.spineItem

    this.container = this.containerElement.ownerDocument.createElement("div")
    this.container.dataset["highlightContainer"] = this.highlight.id
    this.containerElement.appendChild(this.container)

    this.tap$ = fromEvent(this.container, "click").pipe(
      map((event) => ({ event, highlight: this.highlight })),
      share(),
    )

    this.render()

    this.isSelected
      .pipe(
        skip(1),
        tap((isSelected) => {
          Array.from(this.container.children).forEach((child) => {
            if (child instanceof HTMLElement) {
              child.style.border = isSelected ? "2px dashed red" : "none"
            }
          })
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  public render() {
    this.container.innerHTML = ""

    const { node: anchorNode, offset: anchorOffset } = this.reader.cfi.resolveCfi({ cfi: this.highlight.anchorCfi ?? `` }) ?? {}
    const { node: focusNode, offset: focusOffset } = this.reader.cfi.resolveCfi({ cfi: this.highlight.focusCfi ?? `` }) ?? {}

    if (!anchorNode || !focusNode) {
      report.error(`Unable to resolve anchor cfi: ${this.highlight.anchorCfi}`)

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
      elt.style.backgroundColor = this.highlight.color ?? "yellow"
      elt.dataset["highlightRect"] = this.highlight.id

      this.container.appendChild(elt)
    })
  }

  isWithinTarget(target: Node) {
    return this.container.contains(target)
  }

  public destroy() {
    super.destroy()

    this.container.remove()
  }
}
