import { type Reader, isShallowEqual, observeResize } from "@prose-reader/core"
import {
  Observable,
  animationFrameScheduler,
  combineLatest,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
  switchMap,
  tap,
  throttleTime,
} from "rxjs"
import { snapshotSpineItem } from "./utils/spineItemSnapshot"

const createRootElement = (options: {
  columns?: number
}) => {
  const rootElement = document.createElement("div")

  rootElement.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${options.columns ?? `var(--prose-gallery-columns, 2)`}, minmax(0, 1fr));
      height: 100%;
      width: 100%;
      gap: 20px;
      box-sizing: border-box;
      overflow-x: hidden;
    `

  return rootElement
}

const createGridItem = (
  rootElement: HTMLElement,
  options: {
    gridItemClassName?: string
  },
) => {
  const gridItemElement = document.createElement("div")
  gridItemElement.style.width = `100%`
  gridItemElement.style.position = "relative"
  gridItemElement.style.aspectRatio = `2/3`
  gridItemElement.className = options.gridItemClassName ?? ""

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
  gridItemElement.appendChild(spineItemContainerElement)
  rootElement.appendChild(gridItemElement)

  return spineItemContainerElement
}

export class Gallery extends Observable<HTMLElement> {
  constructor(
    reader: Reader,
    options: {
      columns?: number
      gridItemClassName?: string
    } = {},
  ) {
    super((subscriber) => {
      const rootElement = createRootElement(options)

      subscriber.next(rootElement)

      return reader.spineItemsManager.items$
        .pipe(
          throttleTime(500, animationFrameScheduler, { trailing: true }),
          switchMap((items) => {
            const unlock = reader.spine.spineItemsLoader.forceOpen(items)

            rootElement.innerHTML = ""

            const itemElements = items.map(() =>
              createGridItem(rootElement, options),
            )

            observeResize(rootElement).pipe()

            const cloneSpineItemIntoItems$ = combineLatest(
              items.map((item, index) => {
                const itemReadyAndLayoutChanged$ = item.isReady$.pipe(
                  filter((isReady) => isReady),
                  map(() => item.layout.layoutInfo),
                  distinctUntilChanged(isShallowEqual),
                )

                return itemReadyAndLayoutChanged$.pipe(
                  tap(() => {
                    const pageSize = reader.viewport.value.pageSize
                    const itemElement = itemElements[index]
                    const contentMask = itemElement?.children[0] as
                      | HTMLElement
                      | undefined

                    if (!itemElement || !contentMask) return

                    // mask reset
                    contentMask.style.top = "0"
                    contentMask.style.left = "0"

                    itemElement.style.aspectRatio = `${pageSize.width / pageSize.height}`

                    const measure = itemElement.getBoundingClientRect()
                    const { height, width } = item.layout.layoutInfo
                    const numberOfPages = item.numberOfPages
                    const widthScaleFullFrame =
                      (measure.width / width) * numberOfPages
                    const heightScale = measure.height / height

                    // Use the minimum scale to ensure the element fits within both dimensions
                    const scale = Math.min(widthScaleFullFrame, heightScale)

                    const clonedElement = snapshotSpineItem(item.element)

                    clonedElement.style.left = "0"
                    clonedElement.style.top = "0"
                    clonedElement.style.position = "relative"
                    clonedElement.style.transformOrigin = "0 0"
                    clonedElement.style.transform = `scale(${scale})`

                    /**
                     * Now we adjust the mask to make it fit in the center and cover
                     * only the required part of the spine item (hidding) the overflowing
                     * pages for example.
                     */
                    const pageWidthAfterScale = pageSize.width * scale
                    const pageHeightAfterScale = pageSize.height * scale

                    contentMask.style.width = `${pageWidthAfterScale}px`
                    contentMask.style.height = `${pageHeightAfterScale}px`

                    if (pageWidthAfterScale < measure.width) {
                      const gap = (measure.width - pageWidthAfterScale) / 2

                      contentMask.style.left = `${gap}px`
                    }

                    if (pageHeightAfterScale < measure.height) {
                      const gap = (measure.height - pageHeightAfterScale) / 2

                      contentMask.style.top = `${gap}px`
                    }

                    contentMask.innerHTML = ""
                    contentMask.appendChild(clonedElement)
                  }),
                )
              }),
            )

            return merge(cloneSpineItemIntoItems$).pipe(
              finalize(() => {
                unlock()
              }),
            )
          }),
          finalize(() => {
            rootElement.remove()
          }),
        )
        .subscribe()
    })
  }
}
