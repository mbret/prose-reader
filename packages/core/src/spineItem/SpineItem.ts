import { Context } from "../context/Context"
import { Manifest } from ".."
import { merge, Observable, Subject } from "rxjs"
import { createFingerTracker, createSelectionTracker } from "./trackers"
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  switchMap,
  withLatestFrom,
} from "rxjs/operators"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { Renderer } from "./renderers/Renderer"
import { upsertCSS } from "../utils/frames"
import { HtmlRenderer } from "./renderers/html/HtmlRenderer"

export class SpineItem {
  destroySubject$: Subject<void>
  containerElement: HTMLElement
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
    this.fingerTracker = createFingerTracker()
    this.selectionTracker = createSelectionTracker()

    parentElement.appendChild(this.containerElement)

    const RendererClass =
      this.settings.values.getRenderer?.(item) ?? HtmlRenderer
    // this.settings.values.getRenderer?.(item) ?? MediaRenderer

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
      this.unloaded$.pipe(map(() => ({ isFirstLayout: false }))),
      this.ready$.pipe(map(() => ({ isFirstLayout: true }))),
    )

    this.contentLayout$ = contentLayoutChange$.pipe(
      withLatestFrom(this.isReady$),
      map(([data, isReady]) => ({
        isFirstLayout: data.isFirstLayout,
        isReady,
      })),
    )
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

  /**
   * @important
   * Do not use this value for layout and navigation. It will be in possible conflict
   * with the global reading direction. A book should not mix them anyway. A page can have
   * a different reading direction for style reason but it should be in theory pre-paginated.
   * For example an english page in a japanese manga. That's expected and will
   * be confined to a single page.
   */
  get readingDirection() {
    return this.renderer.readingDirection
  }

  isUsingVerticalWriting = () =>
    this.renderer.writingMode?.startsWith(`vertical`)

  get isReady() {
    return this.renderer.state$.getValue() === "ready"
  }

  get ready$() {
    return this.renderer.state$.pipe(
      distinctUntilChanged(),
      filter((state) => state === "ready"),
    )
  }

  get loaded$() {
    return this.renderer.state$.pipe(
      distinctUntilChanged(),
      filter((state) => state === "loaded"),
    )
  }

  get unloaded$() {
    return this.renderer.state$.pipe(
      distinctUntilChanged(),
      filter((state) => state !== "idle"),
      switchMap(() =>
        this.renderer.state$.pipe(
          filter((state) => state === `idle`),
          first(),
        ),
      ),
    )
  }

  get isReady$() {
    return this.renderer.state$.pipe(map((state) => state === "ready"))
  }

  /**
   * Helper that will inject CSS into the document frame.
   *
   * @important
   * The document needs to be detected as a frame.
   */
  upsertCSS(id: string, style: string, prepend?: boolean) {
    this.renderer.layers.forEach((layer) => {
      if (layer.element instanceof HTMLIFrameElement) {
        upsertCSS(layer.element, id, style, prepend)
      }
    })
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
