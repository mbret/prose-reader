import { Context } from "../context/Context"
import { Manifest } from ".."
import { merge, Observable, Subject } from "rxjs"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import { map, withLatestFrom } from "rxjs/operators"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { detectMimeTypeFromName } from "@prose-reader/shared"
import { HtmlRenderer } from "./renderers/html/HtmlRenderer"
import { Renderer } from "./renderers/Renderer"

export class SpineItem {
  destroySubject$: Subject<void>
  containerElement: HTMLElement
  overlayElement: HTMLElement
  fingerTracker: ReturnType<typeof createFingerTracker>
  selectionTracker: ReturnType<typeof createSelectionTracker>
  contentLayout$: Observable<{
    isFirstLayout: boolean
    isReady: boolean
  }>
  public renderer: Renderer

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

    const RendererClass =
      this.settings.values.getRenderer?.(item) ?? HtmlRenderer

    this.renderer = new RendererClass(
      context,
      settings,
      hookManager,
      item,
      this.containerElement,
    )

    /**
     * This is used as upstream layout change. This event is being listened to by upper app
     * in order to layout again and adjust every element based on the new content.
     */
    const contentLayoutChange$ = merge(
      this.renderer.unloaded$.pipe(map(() => ({ isFirstLayout: false }))),
      this.renderer.ready$.pipe(map(() => ({ isFirstLayout: true }))),
    )

    this.contentLayout$ = contentLayoutChange$.pipe(
      withLatestFrom(this.renderer.isReady$),
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
  public isImageType = () => {
    const mimeType =
      this.item.mediaType ?? detectMimeTypeFromName(this.item.href)

    return !!mimeType?.startsWith(`image/`)
  }

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
    const frameElement = this.renderer.layers[0]?.element

    if (frameElement && frameElement instanceof HTMLIFrameElement && selector) {
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

  public layout = ({
    blankPagePosition,
    minimumWidth,
    spreadPosition,
  }: {
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
    spreadPosition: `left` | `right` | `none`
  }) => {
    this.hookManager.execute(`item.onBeforeLayout`, undefined, {
      blankPagePosition,
      item: this.item,
      minimumWidth,
    })

    const { height, width } = this.renderer.render({
      blankPagePosition,
      minPageSpread: minimumWidth / this.context.getPageSize().width,
      spreadPosition,
    })

    this.containerElement.style.width = `${width}px`
    this.containerElement.style.height = `${height}px`

    this.hookManager.execute(`item.onAfterLayout`, undefined, {
      blankPagePosition,
      item: this.item,
      minimumWidth,
    })

    return { width, height }
  }

  getViewPortInformation = () => {
    return this.renderer.getViewPortInformation()
  }

  translateFramePositionIntoPage = (position: {
    clientX: number
    clientY: number
  }) => {
    const frameElement = this.renderer.layers[0]?.element

    // Here we use getBoundingClientRect meaning we will get relative value for left / top based on current
    // window (viewport). This is handy because we can easily get the translated x/y without any extra information
    // such as page index, etc. However this might be a bit less performance to request heavily getBoundingClientRect
    const { left = 0, top = 0 } = frameElement?.getBoundingClientRect() || {}
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

    return await lastFetch(this.item)
  }

  load = () => this.renderer.load()

  unload = () => this.renderer.unload()

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

  get element() {
    return this.containerElement
  }

  get isReady() {
    return this.renderer.isReady
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

  isUsingVerticalWriting = () => this.renderer.isUsingVerticalWriting()

  get loaded$() {
    return this.renderer.loaded$
  }

  get isReady$() {
    return this.renderer.isReady$
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
