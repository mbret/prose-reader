import {
  DocumentRenderer,
  getThemeBackgroundColor,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import { filter, finalize, first, Observable, switchMap } from "rxjs"
import { deepCloneElement } from "./utils/deepCloneElement"

const SNAPSHOT_CLASS = "prose-reader-enhancer-gallery-snapshot"
const SNAPSHOT_MASK_CLASS = "prose-reader-enhancer-gallery-snapshot-mask"
const SNAPSHOT_PREVIEW_CLASS = "prose-reader-enhancer-gallery-snapshot-preview"
const SNAPSHOT_FRAME_CLASS = "prose-reader-enhancer-gallery-snapshot-frame"

const createSnapshotItem = (doc: Document, pageBackgroundColor: string) => {
  const snapshotElement = doc.createElement("div")
  snapshotElement.classList.add(SNAPSHOT_CLASS)
  snapshotElement.tabIndex = -1
  snapshotElement.setAttribute("aria-hidden", "true")
  snapshotElement.setAttribute("inert", "")

  const contentMask = doc.createElement("div")

  contentMask.classList.add(SNAPSHOT_MASK_CLASS)
  // A snapshot lives outside the reader's container, so it paints the
  // background the container shows behind the pages itself.
  contentMask.style.backgroundColor = pageBackgroundColor

  snapshotElement.appendChild(contentMask)

  return { snapshotElement, contentMask }
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
      const releaseSpineItem = reader.keepSpineItemLoaded(item)
      let releaseSnapshotAssets = () => {}
      let snapshotItem: HTMLElement | undefined

      const subscription = item.isReady$
        .pipe(
          filter((isReady) => isReady),
          first(),
          switchMap(() => {
            const { snapshotElement, contentMask } = createSnapshotItem(
              parentDocument,
              getThemeBackgroundColor(reader.theme.get()),
            )
            snapshotItem = snapshotElement

            const pageSize = reader.viewport.value.pageSize

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

            parent.appendChild(snapshotElement)
            contentMask.appendChild(clonedElement)

            subscriber.next(snapshotElement)

            return cloneReady$
          }),
          finalize(releaseSpineItem),
        )
        // Keep the observable open after cloning so the thumbnail owns its
        // copied object URLs until React unsubscribes from this snapshot.
        .subscribe({
          error: (error) => subscriber.error(error),
        })

      return () => {
        subscription.unsubscribe()
        releaseSnapshotAssets()
        snapshotItem?.remove()
      }
    })
  }
}
