/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context } from "../context/Context"
import { createFrameItem } from "./frame/frameItems"
import { Manifest } from ".."
import { Subject } from "rxjs"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import { map, withLatestFrom } from "rxjs/operators"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { detectMimeTypeFromName } from "@prose-reader/shared"

export const createCommonSpineItem = ({
  item,
  context,
  parentElement,
  settings,
  hookManager,
  index,
}: {
  item: Manifest[`spineItems`][number]
  parentElement: HTMLElement
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  index: number
}) => {
  const destroySubject$ = new Subject<void>()
  const containerElement = createContainerElement(
    parentElement,
    item,
    hookManager,
  )
  const overlayElement = createOverlayElement(parentElement, item)
  const fingerTracker = createFingerTracker()
  const selectionTracker = createSelectionTracker()
  const frame = createFrameItem({
    parent: containerElement,
    item,
    context,
    hookManager,
    settings,
  })
  // let layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number } = { blankPagePosition: `none`, minimumWidth: context.getPageSize().width }

  containerElement.appendChild(overlayElement)
  parentElement.appendChild(containerElement)

  // @todo use spine item manager global layout reference if possible
  // @todo getAbsolutePositionOf (for width and height)
  const getElementDimensions = () => {
    // Keep in mind that getBoundingClientRect takes scale transform into consideration
    // It's better to not use this is the viewport / spine is being scaled
    const rect = containerElement.getBoundingClientRect()
    const normalizedValues = {
      ...rect,
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    }

    return normalizedValues
  }

  /**
   * Detect the type of resource (independently of rendition flow).
   * If an image is detected for reflowable for example we may want to display
   * things accordingly.
   */
  const isImageType = () => {
    const mimeType = item.mediaType ?? detectMimeTypeFromName(item.href)

    return !!mimeType?.startsWith(`image/`)
  }

  const injectStyle = (cssText: string) => {
    frame.removeStyle(`prose-reader-css`)
    frame.addStyle(`prose-reader-css`, cssText)
  }

  const adjustPositionOfElement = ({
    right,
    left,
    top,
  }: {
    right?: number
    left?: number
    top?: number
  }) => {
    if (right !== undefined) {
      containerElement.style.right = `${right}px`
    } else {
      containerElement.style.removeProperty(`right`)
    }
    if (left !== undefined) {
      containerElement.style.left = `${left}px`
    } else {
      containerElement.style.removeProperty(`left`)
    }
    if (top !== undefined) {
      containerElement.style.top = `${top}px`
    } else {
      containerElement.style.removeProperty(`top`)
    }
  }

  const getViewPortInformation = () => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const viewportDimensions = frame.getViewportDimensions()
    const frameElement = frame.element

    if (
      containerElement &&
      frameElement?.contentDocument &&
      frameElement?.contentWindow &&
      viewportDimensions
    ) {
      const computedWidthScale = pageWidth / viewportDimensions.width
      const computedScale = Math.min(
        computedWidthScale,
        pageHeight / viewportDimensions.height,
      )

      return { computedScale, computedWidthScale, viewportDimensions }
    }
  }

  const load = () => frame.load()

  const unload = () => frame.unload()

  const getBoundingRectOfElementFromSelector = (selector: string) => {
    const frameElement = frame.element
    if (frameElement && selector) {
      if (selector.startsWith(`#`)) {
        return frameElement.contentDocument
          ?.getElementById(selector.replace(`#`, ``))
          ?.getBoundingClientRect()
      }
      return frameElement.contentDocument
        ?.querySelector(selector)
        ?.getBoundingClientRect()
    }
  }

  const getDimensionsForPaginatedContent = () => {
    const pageSize = context.getPageSize()
    const pageWidth = pageSize.width
    const columnHeight = pageSize.height
    const columnWidth = pageWidth

    return { columnHeight, columnWidth }
  }

  const getDimensionsForReflowableContent = (
    isUsingVerticalWriting: boolean,
    minimumWidth: number,
  ) => {
    const pageSize = context.getPageSize()
    const horizontalMargin = 0
    const verticalMargin = 0
    let columnWidth = pageSize.width - horizontalMargin * 2
    const columnHeight = pageSize.height - verticalMargin * 2
    let width = pageSize.width - horizontalMargin * 2

    if (isUsingVerticalWriting) {
      width = minimumWidth - horizontalMargin * 2
      columnWidth = columnHeight
    }

    return {
      columnHeight,
      columnWidth,
      // horizontalMargin,
      // verticalMargin,
      width,
    }
  }

  const layout = ({
    height,
    width,
    blankPagePosition,
    minimumWidth,
  }: {
    height: number
    width: number
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
  }) => {
    containerElement.style.width = `${width}px`
    containerElement.style.height = `${height}px`

    hookManager.execute(`item.onAfterLayout`, undefined, {
      blankPagePosition,
      item,
      minimumWidth,
    })
  }

  const translateFramePositionIntoPage = (position: {
    clientX: number
    clientY: number
  }) => {
    // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
    // window (viewport). This is handy because we can easily get the translated x/y without any extra information
    // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
    const { left = 0, top = 0 } =
      frame.getFrameElement()?.getBoundingClientRect() || {}
    const computedScale = getViewPortInformation()?.computedScale ?? 1
    const adjustedX = position.clientX * computedScale + left
    const adjustedY = position.clientY * computedScale + top

    return {
      clientX: adjustedX,
      clientY: adjustedY,
    }
  }

  const getResource = async () => {
    const fetchResource = settings.settings.fetchResource

    const lastFetch = (_: Manifest[`spineItems`][number]) => {
      if (fetchResource) {
        return fetchResource(item)
      }

      return fetch(item.href)
    }

    // const finalFetch = hooks$.getValue().reduce((acc, hook) => {
    //   if (hook.name === `item.onGetResource`) {
    //     return hook.fn(acc)
    //   }

    //   return acc
    // }, lastFetch)

    // return await finalFetch(item)
    return await lastFetch(item)
  }

  const executeOnLayoutBeforeMeasurementHook = (options: {
    minimumWidth: number
  }) =>
    hookManager.execute("item.onLayoutBeforeMeasurement", undefined, {
      itemIndex: index,
      isImageType,
      ...options,
    })

  const contentLayout$ = frame.$.contentLayoutChange$.pipe(
    withLatestFrom(frame.$.isReady$),
    map(([data, isReady]) => ({
      isFirstLayout: data.isFirstLayout,
      isReady,
    })),
  )

  return {
    item,
    layout,
    overlayElement,
    adjustPositionOfElement,
    getElementDimensions,
    getHtmlFromResource: frame.getHtmlFromResource,
    getResource,
    translateFramePositionIntoPage,
    injectStyle,
    load,
    unload,
    frame,
    element: containerElement,
    getBoundingRectOfElementFromSelector,
    getViewPortInformation,
    isImageType,
    isReady: frame.getIsReady,
    destroy: () => {
      destroySubject$.next()
      containerElement.remove()
      frame?.destroy()
      fingerTracker.destroy()
      selectionTracker.destroy()
      destroySubject$.complete()
    },
    isUsingVerticalWriting: () =>
      frame.getWritingMode()?.startsWith(`vertical`),
    /**
     * @important
     * Do not use this value for layout and navigation. It will be in possible conflict
     * with the global reading direction. A book should not mix them anyway. A page can have
     * a different reading direction for style reason but it should be in theory pre-paginated.
     * For example an english page in a japanese manga. That's expected and will
     * be confined to a single page.
     */
    getReadingDirection: () => {
      return frame.getReadingDirection() || context.readingDirection
    },
    executeOnLayoutBeforeMeasurementHook: executeOnLayoutBeforeMeasurementHook,
    selectionTracker,
    fingerTracker,
    getDimensionsForReflowableContent,
    getDimensionsForPaginatedContent,
    $: {
      contentLayout$,
      loaded$: frame.$.loaded$,
      isReady$: frame.$.isReady$,
    },
  }
}

const createContainerElement = (
  containerElement: HTMLElement,
  item: Manifest[`spineItems`][number],
  hookManager: HookManager,
) => {
  const element: HTMLElement =
    containerElement.ownerDocument.createElement(`div`)
  element.classList.add(`spineItem`)
  element.classList.add(`spineItem-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
    border: 1px solid red;
  `

  hookManager.execute("item.onBeforeContainerCreated", undefined, { element })

  return element
}

const createOverlayElement = (
  containerElement: HTMLElement,
  item: Manifest[`spineItems`][number],
) => {
  const element = containerElement.ownerDocument.createElement(`div`)
  element.classList.add(`spineItemOverlay`)
  element.classList.add(`spineItemOverlay-${item.renditionLayout}`)
  element.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-color: transparent;
  `

  return element
}
