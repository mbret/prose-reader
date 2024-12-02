import { Context } from "../context/Context"
import { DestroyableClass, Manifest } from ".."
import { defer, merge, Observable, ObservedValueOf, of, Subject } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs/operators"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { DocumentRenderer } from "./renderer/DocumentRenderer"
import { ResourceHandler } from "./resources/ResourceHandler"
import { DefaultRenderer } from "./renderer/DefaultRenderer"
import { deferNextResult } from "../utils/rxjs"

export class SpineItem extends DestroyableClass {
  private layoutTriggerSubject = new Subject<{
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
    spreadPosition: `left` | `right` | `none`
  }>()

  public readonly containerElement: HTMLElement
  public readonly needsLayout$: Observable<unknown>
  public readonly renderer: DocumentRenderer
  public readonly resourcesHandler: ResourceHandler
  public readonly layout$: Observable<{ width: number; height: number }>
  /**
   * Renderer loaded + spine item layout done
   */
  public readonly isReady$: Observable<boolean>

  constructor(
    public item: Manifest[`spineItems`][number],
    public parentElement: HTMLElement,
    public context: Context,
    public settings: ReaderSettingsManager,
    public hookManager: HookManager,
    public index: number,
  ) {
    super()

    this.containerElement = createContainerElement(
      parentElement,
      item,
      hookManager,
    )

    parentElement.appendChild(this.containerElement)

    const rendererFactory = this.settings.values.getRenderer?.(item)

    this.resourcesHandler = new ResourceHandler(item, this.settings)

    const rendererParams = {
      context,
      settings,
      hookManager,
      item,
      containerElement: this.containerElement,
      resourcesHandler: this.resourcesHandler,
    }

    this.renderer = rendererFactory
      ? rendererFactory(rendererParams)
      : new DefaultRenderer(rendererParams)

    const layoutProcess$ = this.layoutTriggerSubject.pipe(
      switchMap(({ blankPagePosition, minimumWidth, spreadPosition }) => {
        this.hookManager.execute(`item.onBeforeLayout`, undefined, {
          blankPagePosition,
          item: this.item,
          minimumWidth,
        })

        const layout$ = this.renderer.layout({
          blankPagePosition,
          minPageSpread: minimumWidth / this.context.getPageSize().width,
          minimumWidth,
          spreadPosition,
        })

        return merge(
          of({ type: "start" } as const),
          layout$.pipe(
            map(({ height, width }) => {
              this.containerElement.style.width = `${width}px`
              this.containerElement.style.height = `${height}px`

              this.hookManager.execute(`item.onAfterLayout`, undefined, {
                blankPagePosition,
                item: this.item,
                minimumWidth,
              })

              return {
                type: "end",
                data: { width, height },
              } as const
            }),
          ),
        )
      }),
      share(),
    )

    this.isReady$ = layoutProcess$.pipe(
      withLatestFrom(this.renderer.isLoaded$),
      map(([event, loaded]) => !!(event.type === `end` && loaded)),
      startWith(false),
      distinctUntilChanged(),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    this.layout$ = layoutProcess$.pipe(
      filter((event) => event.type === `end`),
      map((event) => event.data),
      share(),
    )

    this.needsLayout$ = merge(this.unloaded$, this.loaded$)

    merge(
      /**
       * @important
       * The order is important here. We want to ensure the isReady value
       * is set before dispatching the layout event. Elements reacting
       * to layout changes may rely on the isReady value.
       */
      this.isReady$,
      this.layout$,
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
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
    const frameElement = this.renderer.getDocumentFrame()

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

  public layout = (
    params: ObservedValueOf<typeof this.layoutTriggerSubject>,
  ) => {
    const nextResult = deferNextResult(this.layout$.pipe(first()))

    this.layoutTriggerSubject.next(params)

    return nextResult()
  }

  load = () => this.renderer.load()

  unload = () => {
    this.renderer.unload()
  }

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
    super.destroy()

    this.containerElement.remove()
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
    !!this.renderer.writingMode?.startsWith(`vertical`)

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

  get renditionLayout() {
    const itemRenditionLayout = this.item.renditionLayout

    if (itemRenditionLayout) return itemRenditionLayout

    return this.context.manifest?.renditionLayout ?? "reflowable"
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
