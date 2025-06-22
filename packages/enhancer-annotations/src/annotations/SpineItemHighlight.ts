import {
  DestroyableClass,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import {
  type Observable,
  first,
  fromEvent,
  map,
  merge,
  share,
  shareReplay,
  skip,
  takeUntil,
  tap,
} from "rxjs"
import type { RuntimeAnnotation } from "./types"
import { createElementForRange } from "./utils"

export class SpineItemHighlight extends DestroyableClass {
  private container: HTMLElement
  public readonly tap$: Observable<{
    event: Event
    highlight: RuntimeAnnotation
  }>
  private resolvedCfi$: Observable<ReturnType<Reader["cfi"]["resolveCfi"]>>

  constructor(
    private spineItem: SpineItem,
    private containerElement: HTMLElement,
    private reader: Reader,
    public readonly highlight: RuntimeAnnotation,
    private isSelected: Observable<boolean>,
  ) {
    super()

    void this.spineItem
    void this.reader

    this.container = this.containerElement.ownerDocument.createElement("div")
    this.container.dataset.highlightContainer = this.highlight.id
    this.containerElement.appendChild(this.container)

    this.tap$ = fromEvent(this.container, "click").pipe(
      map((event) => ({ event, highlight: this.highlight })),
      share(),
    )

    this.resolvedCfi$ = this.spineItem.loaded$.pipe(
      map(() => this.reader.cfi.resolveCfi({ cfi: this.highlight.cfi })),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    this.isSelected
      .pipe(
        skip(1),
        tap((isSelected) => {
          Array.from(this.container.children).forEach((child) => {
            if (child instanceof HTMLElement) {
              child.style.border = isSelected
                ? "3px dashed red"
                : "3px dashed transparent"
            }
          })
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()

    merge(this.resolvedCfi$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  public render() {
    return this.resolvedCfi$.pipe(
      first(),
      map((resolvedCfi) => {
        if (!resolvedCfi || !resolvedCfi.isRange) return undefined

        const range = resolvedCfi.range

        this.container.innerHTML = ""

        /**
         * The nodes can be undefined if the cfi is not found.
         * This can happens if the item is not loaded (legit) or if the cfi
         * are just invalid.
         */
        if (!range) {
          return
        }

        const rectElements = createElementForRange(
          range,
          this.container,
          this.highlight.highlightColor ?? "yellow",
        )

        rectElements.forEach((elt) => {
          elt.style.pointerEvents = "initial"
          elt.style.cursor = "pointer"
          elt.dataset.highlightRect = this.highlight.id

          this.container.appendChild(elt)
        })

        const firstElement = rectElements[0]

        if (firstElement && this.highlight.notes) {
          const noteIcon = document.createElement("span")
          noteIcon.textContent = "📝"
          noteIcon.style.position = "absolute"
          noteIcon.style.top = "0"
          noteIcon.style.left = "0"
          noteIcon.style.transform = "translate(-0%, -80%)"
          noteIcon.style.fontSize = "18px"
          noteIcon.style.opacity = "50%"
          firstElement.appendChild(noteIcon)
        }

        return null
      }),
    )
  }

  isWithinTarget(target: Node) {
    return this.container.contains(target)
  }

  public destroy() {
    super.destroy()

    this.container.remove()
  }
}
