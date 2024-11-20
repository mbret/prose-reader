import { DestroyableClass, Reader, SpineItem } from "@prose-reader/core"
import { RuntimeHighlight } from "../types"
import { createElementForRange, getRangeFromSelection } from "./utils"
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
              child.style.border = isSelected ? "3px dashed red" : "3px dashed transparent"
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

    /**
     * The nodes can be undefined if the cfi is not found.
     * This can happens if the item is not loaded (legit) or if the cfi
     * are just invalid.
     */
    if (!anchorNode || !focusNode) {
      return
    }

    const range = getRangeFromSelection(
      this.containerElement,
      { node: anchorNode, offset: anchorOffset },
      { node: focusNode, offset: focusOffset },
    )

    const rectElements = createElementForRange(range, this.container, this.highlight.color ?? "yellow")

    rectElements.forEach((elt) => {
      elt.style.pointerEvents = "initial"
      elt.style.cursor = "pointer"
      elt.dataset["highlightRect"] = this.highlight.id

      this.container.appendChild(elt)
    })

    const firstElement = rectElements[0]

    if (firstElement && this.highlight.contents?.length) {
      const noteIcon = document.createElement("span")
      noteIcon.textContent = "📝"
      noteIcon.style.position = "absolute"
      noteIcon.style.top = "0"
      noteIcon.style.left = "0"
      noteIcon.style.transform = "translate(-0%, -50%)"
      noteIcon.style.fontSize = "28px"
      firstElement.appendChild(noteIcon)
    }
  }

  isWithinTarget(target: Node) {
    return this.container.contains(target)
  }

  public destroy() {
    super.destroy()

    this.container.remove()
  }
}
