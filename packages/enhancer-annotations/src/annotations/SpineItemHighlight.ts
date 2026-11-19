import {
  DestroyableClass,
  type Reader,
  setStylePropertyIfChanged,
} from "@prose-reader/core"
import {
  fromEvent,
  map,
  type Observable,
  share,
  take,
  takeUntil,
  tap,
} from "rxjs"
import type { RuntimeAnnotation } from "./types.ts"
import { createElementForRange } from "./utils.ts"

export class SpineItemHighlight extends DestroyableClass {
  private container: HTMLElement
  private latestAnnotation: RuntimeAnnotation
  public readonly tap$: Observable<{
    event: Event
    highlight: RuntimeAnnotation
  }>

  constructor(
    private containerElement: HTMLElement,
    private reader: Reader,
    annotation: RuntimeAnnotation,
    private isSelected$: Observable<boolean>,
  ) {
    super()

    this.latestAnnotation = annotation

    this.container = this.containerElement.ownerDocument.createElement("div")
    this.container.dataset.highlightContainer = annotation.id
    this.containerElement.appendChild(this.container)

    this.tap$ = fromEvent(this.container, "click").pipe(
      map((event) => ({ event, highlight: this.annotation })),
      takeUntil(this.destroy$),
      share(),
    )

    this.isSelected$
      .pipe(
        tap((isSelected) => {
          this.updateStateOnSelection(isSelected)
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  public get annotation() {
    return this.latestAnnotation
  }

  /** Does not draw: the next `render()` draws the new annotation. */
  public update(annotation: RuntimeAnnotation) {
    this.latestAnnotation = annotation
  }

  public updateStateOnSelection(isSelected: boolean) {
    Array.from(this.container.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        setStylePropertyIfChanged(
          child.style,
          `border`,
          isSelected ? "3px dashed red" : "3px dashed transparent",
        )
      }
    })
  }

  public render() {
    return this.isSelected$.pipe(
      take(1),
      map((isSelected) => {
        const { range } = this.reader.cfi.resolveCfi({
          cfi: this.annotation.cfi,
        })

        if (this.container.firstChild) this.container.replaceChildren()

        /**
         * No range when the cfi is not a range, when the item has no loaded
         * document, or when the cfi is invalid.
         */
        if (!range) return null

        const rectElements = createElementForRange(
          range,
          this.container,
          this.annotation.highlightColor ?? "yellow",
        )

        rectElements.forEach((elt) => {
          elt.style.pointerEvents = "initial"
          elt.style.cursor = "pointer"
          elt.dataset.highlightRect = this.annotation.id

          this.container.appendChild(elt)
        })

        const firstElement = rectElements[0]

        if (firstElement && this.annotation.notes) {
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

        this.updateStateOnSelection(isSelected)

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
