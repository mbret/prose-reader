import {
  DocumentRenderer,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import { filter, finalize, first, Observable, switchMap, tap } from "rxjs"
import { deepCloneElement } from "./utils/deepCloneElement"

const createSnapshotItem = () => {
  const spineItemContainerElement = document.createElement("div")
  spineItemContainerElement.style.width = `100%`
  spineItemContainerElement.style.height = `100%`
  spineItemContainerElement.style.position = "relative"
  spineItemContainerElement.style.overflow = "hidden"

  const contentMask = document.createElement("div")

  contentMask.style.width = "100%"
  contentMask.style.height = "100%"
  contentMask.style.position = "absolute"
  contentMask.style.top = "0"
  contentMask.style.left = "0"
  contentMask.style.overflow = "hidden"

  spineItemContainerElement.appendChild(contentMask)

  return spineItemContainerElement
}

export class Snapshot extends Observable<HTMLElement> {
  constructor(
    reader: Reader,
    item: SpineItem,
    parent: Element,
    options: {
      height: number
      width: number
    },
  ) {
    super((subscriber) => {
      const unlock = reader.spine.spineItemsLoader.forceOpen([item])

      return item.isReady$
        .pipe(
          filter((isReady) => isReady),
          first(),
          switchMap(() => {
            const snapshotItem = createSnapshotItem()

            const pageSize = reader.viewport.value.pageSize
            const itemElement = snapshotItem
            const contentMask = itemElement?.children[0] as
              | HTMLElement
              | undefined

            if (!itemElement || !contentMask)
              throw new Error("No item element or content mask")

            // mask reset
            contentMask.style.top = "0"
            contentMask.style.left = "0"

            const measure = options
            const { height, width } = item.layoutInfo
            const numberOfPages = item.numberOfPages
            const widthScaleFullFrame = (measure.width / width) * numberOfPages
            const heightScale = measure.height / height

            // Use the minimum scale to ensure the element fits within both dimensions
            const scale = Math.min(widthScaleFullFrame, heightScale)

            const { clone: clonedElement, ready$: cloneReady$ } =
              deepCloneElement(item.element)

            // cleanup unwanted elements from the spine
            Array.from(clonedElement.children).forEach((child) => {
              if (
                !child.classList.contains(
                  DocumentRenderer.DOCUMENT_CONTAINER_CLASS_NAME,
                )
              ) {
                child.remove()
              }
            })

            clonedElement.style.left = "0"
            clonedElement.style.top = "0"
            clonedElement.style.position = "relative"

            /**
             * Now we adjust the mask to make it fit in the center and cover
             * only the required part of the spine item (hidding) the overflowing
             * pages for example.
             */
            const pageWidthAfterScale = pageSize.width * scale
            const pageHeightAfterScale = pageSize.height * scale

            contentMask.style.width = `${pageSize.width}px`
            contentMask.style.height = `${pageSize.height}px`
            contentMask.style.transformOrigin = "0 0"
            contentMask.style.transform = `scale(${scale})`

            if (pageWidthAfterScale < measure.width) {
              const gap = (measure.width - pageWidthAfterScale) / 2

              contentMask.style.left = `${gap}px`
            }

            if (pageHeightAfterScale < measure.height) {
              const gap = (measure.height - pageHeightAfterScale) / 2

              contentMask.style.top = `${gap}px`
            }

            parent.appendChild(snapshotItem)
            contentMask.appendChild(clonedElement)

            subscriber.next(snapshotItem)

            return cloneReady$
          }),
          tap(() => {
            subscriber.complete()
          }),
          finalize(() => {
            unlock()
          }),
        )
        .subscribe()
    })
  }
}
