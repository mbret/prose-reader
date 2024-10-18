import { Context } from "../context/Context"
import { Manifest } from ".."
import { Observable, Subject } from "rxjs"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import { map, withLatestFrom } from "rxjs/operators"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { detectMimeTypeFromName } from "@prose-reader/shared"
import { FrameRenderer } from "./renderers/frame/FrameRenderer"

export abstract class SpineItem {
  destroySubject$: Subject<void>
  containerElement: HTMLElement
  overlayElement: HTMLElement
  fingerTracker: ReturnType<typeof createFingerTracker>
  selectionTracker: ReturnType<typeof createSelectionTracker>
  contentLayout$: Observable<{
    isFirstLayout: boolean
    isReady: boolean
  }>
  public renderer: FrameRenderer

  constructor(
    public item: Manifest[`spineItems`][number],
    public parentElement: HTMLElement,
    public context: Context,
    public settings: ReaderSettingsManager,
    public hookManager: HookManager,
    public index: number,
  ) {
    this.destroySubject$ = new Subject<void>()
    this.containerElement = createContainerElement(
      parentElement,
      item,
      hookManager,
    )
    this.overlayElement = createOverlayElement(parentElement, item)
    this.fingerTracker = createFingerTracker()
    this.selectionTracker = createSelectionTracker()

    this.containerElement.appendChild(this.overlayElement)
    parentElement.appendChild(this.containerElement)

    this.renderer = new FrameRenderer(
      context,
      settings,
      hookManager,
      item,
      this.containerElement,
    )

    this.contentLayout$ = this.renderer.frameItem.contentLayoutChange$.pipe(
      withLatestFrom(this.renderer.frameItem.isReady$),
      map(([data, isReady]) => ({
        isFirstLayout: data.isFirstLayout,
        isReady,
      })),
    )
  }

  /**
   * Detect the type of resource (independently of rendition flow).
   * If an image is detected for reflowable for example we may want to display
   * things accordingly.
   */
  protected isImageType = () => {
    const mimeType =
      this.item.mediaType ?? detectMimeTypeFromName(this.item.href)

    return !!mimeType?.startsWith(`image/`)
  }

  executeOnLayoutBeforeMeasurementHook = (options: { minimumWidth: number }) =>
    this.hookManager.execute("item.onLayoutBeforeMeasurement", undefined, {
      itemIndex: this.index,
      isImageType: this.isImageType,
      ...options,
    })

  adjustPositionOfElement = ({
    right,
    left,
    top,
  }: {
    right?: number
    left?: number
    top?: number
  }) => {
    if (right !== undefined) {
      this.containerElement.style.right = `${right}px`
    } else {
      this.containerElement.style.removeProperty(`right`)
    }
    if (left !== undefined) {
      this.containerElement.style.left = `${left}px`
    } else {
      this.containerElement.style.removeProperty(`left`)
    }
    if (top !== undefined) {
      this.containerElement.style.top = `${top}px`
    } else {
      this.containerElement.style.removeProperty(`top`)
    }
  }

  getBoundingRectOfElementFromSelector = (selector: string) => {
    const frameElement = this.renderer.frameItem.element
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

  getDimensionsForReflowableContent = (
    isUsingVerticalWriting: boolean,
    minimumWidth: number,
  ) => {
    const pageSize = this.context.getPageSize()
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

  protected _layout = ({
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
    this.containerElement.style.width = `${width}px`
    this.containerElement.style.height = `${height}px`

    this.hookManager.execute(`item.onAfterLayout`, undefined, {
      blankPagePosition,
      item: this.item,
      minimumWidth,
    })
  }

  getViewPortInformation = () => {
    const { width: pageWidth, height: pageHeight } = this.context.getPageSize()
    const viewportDimensions = this.renderer.frameItem.getViewportDimensions()
    const frameElement = this.renderer.frameItem.element

    if (
      this.containerElement &&
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

  translateFramePositionIntoPage = (position: {
    clientX: number
    clientY: number
  }) => {
    // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
    // window (viewport). This is handy because we can easily get the translated x/y without any extra information
    // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
    const { left = 0, top = 0 } =
      this.renderer.frameItem.element?.getBoundingClientRect() || {}
    const computedScale = this.getViewPortInformation()?.computedScale ?? 1
    const adjustedX = position.clientX * computedScale + left
    const adjustedY = position.clientY * computedScale + top

    return {
      clientX: adjustedX,
      clientY: adjustedY,
    }
  }

  getResource = async () => {
    const fetchResource = this.settings.values.fetchResource

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lastFetch = (_: Manifest[`spineItems`][number]) => {
      if (fetchResource) {
        return fetchResource(this.item)
      }

      return fetch(this.item.href)
    }

    // const finalFetch = hooks$.getValue().reduce((acc, hook) => {
    //   if (hook.name === `item.onGetResource`) {
    //     return hook.fn(acc)
    //   }

    //   return acc
    // }, lastFetch)

    // return await finalFetch(item)
    return await lastFetch(this.item)
  }

  load = () => this.renderer.frameItem.load()

  unload = () => this.renderer.frameItem.unload()

  // @todo use spine item manager global layout reference if possible
  // @todo getAbsolutePositionOf (for width and height)
  getElementDimensions = () => {
    // Keep in mind that getBoundingClientRect takes scale transform into consideration
    // It's better to not use this is the viewport / spine is being scaled
    const rect = this.containerElement.getBoundingClientRect()
    const normalizedValues = {
      ...rect,
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    }

    return normalizedValues
  }

  public destroy = () => {
    this.destroySubject$.next()
    this.containerElement.remove()
    this.fingerTracker.destroy()
    this.selectionTracker.destroy()
    this.destroySubject$.complete()
    this.renderer.destroy()
  }

  get getHtmlFromResource() {
    return this.renderer.frameItem.getHtmlFromResource
  }

  get element() {
    return this.containerElement
  }

  get isReady() {
    return this.renderer.frameItem.isReady
  }

  /**
   * @important
   * Do not use this value for layout and navigation. It will be in possible conflict
   * with the global reading direction. A book should not mix them anyway. A page can have
   * a different reading direction for style reason but it should be in theory pre-paginated.
   * For example an english page in a japanese manga. That's expected and will
   * be confined to a single page.
   */
  get readingDirection(): `ltr` | `rtl` | undefined {
    const writingMode = this.renderer.getWritingMode()
    if (writingMode === `vertical-rl`) {
      return `rtl`
    }

    const direction = this.renderer.getComputedStyleAfterLoad()?.direction
    if ([`ltr`, `rtl`].includes(direction || ``))
      return direction as `ltr` | `rtl`

    return undefined
  }

  isUsingVerticalWriting = () =>
    this.renderer.frameItem.getWritingMode()?.startsWith(`vertical`)

  get loaded$() {
    return this.renderer.frameItem.loaded$
  }

  get isReady$() {
    return this.renderer.frameItem.isReady$
  }

  /**
   * Helper that will inject CSS into the document frame.
   *
   * @important
   * The document needs to be detected as a frame.
   */
  upsertCSS(id: string, style: string, prepend?: boolean) {
    this.renderer.upsertCSS(id, style, prepend)
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
