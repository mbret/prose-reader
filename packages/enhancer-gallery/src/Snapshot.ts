import {
  DocumentRenderer,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import { filter, first, Observable, switchMap } from "rxjs"
import { deepCloneElement } from "./utils/deepCloneElement"

const SNAPSHOT_CLASS = "prose-reader-enhancer-gallery-snapshot"
const SNAPSHOT_MASK_CLASS = "prose-reader-enhancer-gallery-snapshot-mask"
const SNAPSHOT_PREVIEW_CLASS = "prose-reader-enhancer-gallery-snapshot-preview"
const SNAPSHOT_FRAME_CLASS = "prose-reader-enhancer-gallery-snapshot-frame"

const createSnapshotItem = (doc: Document) => {
  const spineItemContainerElement = doc.createElement("div")
  spineItemContainerElement.classList.add(SNAPSHOT_CLASS)
  spineItemContainerElement.tabIndex = -1
  spineItemContainerElement.setAttribute("aria-hidden", "true")
  spineItemContainerElement.setAttribute("inert", "")

  const contentMask = doc.createElement("div")

  contentMask.classList.add(SNAPSHOT_MASK_CLASS)

  spineItemContainerElement.appendChild(contentMask)

  return spineItemContainerElement
}

const makeSnapshotPreviewInert = (element: HTMLElement) => {
  element.classList.add(SNAPSHOT_PREVIEW_CLASS)
  element.tabIndex = -1
  element.setAttribute("aria-hidden", "true")
  element.setAttribute("inert", "")

  element.querySelectorAll("iframe").forEach((iframe) => {
    iframe.classList.add(SNAPSHOT_FRAME_CLASS)
    iframe.tabIndex = -1
    iframe.setAttribute("aria-hidden", "true")
    iframe.setAttribute("inert", "")
  })
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
      const parentDocument = parent.ownerDocument
      const unlockSpineItem = reader.spine.spineItemsLoader.forceOpen([item])
      let hasUnlockedSpineItem = false
      let releaseSnapshotAssets = () => {}
      let snapshotItem: HTMLElement | undefined

      const unlock = () => {
        if (hasUnlockedSpineItem) return

        hasUnlockedSpineItem = true
        unlockSpineItem()
      }

      const subscription = item.isReady$
        .pipe(
          filter((isReady) => isReady),
          first(),
          switchMap(() => {
            snapshotItem = createSnapshotItem(parentDocument)

            const pageSize = reader.viewport.value.pageSize
            const itemElement = snapshotItem
            const contentMask = itemElement?.children[0] as
              | HTMLElement
              | undefined

            if (!itemElement || !contentMask)
              throw new Error("No item element or content mask")

            contentMask.style.top = "0"
            contentMask.style.left = "0"

            const measure = options
            const { height, width } = item.layoutInfo
            const numberOfPages = item.numberOfPages
            const widthScaleFullFrame = (measure.width / width) * numberOfPages
            const heightScale = measure.height / height

            // Use the minimum scale to ensure the element fits within both dimensions
            const scale = Math.min(widthScaleFullFrame, heightScale)

            const {
              clone: clonedElement,
              ready$: cloneReady$,
              release,
            } = deepCloneElement(item.element)
            releaseSnapshotAssets = release

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
            makeSnapshotPreviewInert(clonedElement)

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

            parent.appendChild(itemElement)
            contentMask.appendChild(clonedElement)

            subscriber.next(itemElement)

            return cloneReady$
          }),
        )
        .subscribe({
          error: (error) => {
            unlock()
            subscriber.error(error)
          },
          complete: () => {
            unlock()
            // Keep the observable open after cloning so the thumbnail owns its
            // copied object URLs until React unsubscribes from this snapshot.
          },
        })

      return () => {
        subscription.unsubscribe()
        unlock()
        releaseSnapshotAssets()
        snapshotItem?.remove()
      }
    })
  }
}
