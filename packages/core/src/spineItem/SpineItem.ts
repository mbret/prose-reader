import { type Observable, merge } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs/operators"
import { DestroyableClass, type Manifest } from ".."
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpineItemLayout } from "./SpineItemLayout"
import { DefaultRenderer } from "./renderer/DefaultRenderer"
import type { DocumentRenderer } from "./renderer/DocumentRenderer"
import { ResourceHandler } from "./resources/ResourceHandler"

export class SpineItem extends DestroyableClass {
  private spineItemLayout: SpineItemLayout

  public readonly containerElement: HTMLElement
  public readonly needsLayout$: Observable<unknown>
  public readonly renderer: DocumentRenderer
  public readonly resourcesHandler: ResourceHandler
  public readonly layout$: SpineItemLayout["layout$"]
  public readonly layout: SpineItemLayout["layout"]
  public readonly adjustPositionOfElement: SpineItemLayout["adjustPositionOfElement"]
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

    this.spineItemLayout = new SpineItemLayout(
      item,
      this.containerElement,
      context,
      hookManager,
      this.renderer,
    )

    this.isReady$ = this.spineItemLayout.layoutProcess$.pipe(
      withLatestFrom(this.renderer.isLoaded$),
      map(([event, loaded]) => !!(event.type === `end` && loaded)),
      startWith(false),
      distinctUntilChanged(),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    this.layout$ = this.spineItemLayout.layout$
    this.needsLayout$ = merge(this.unloaded$, this.loaded$)

    merge(
      /**
       * @important
       * The order is important here. We want to ensure the isReady value
       * is set before dispatching the layout event. Elements reacting
       * to layout changes may rely on the isReady value.
       */
      this.isReady$,
      this.spineItemLayout.layout$,
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe()

    this.layout = this.spineItemLayout.layout
    this.adjustPositionOfElement = this.spineItemLayout.adjustPositionOfElement
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

  load = () => {
    this.renderer.load()
  }

  unload = () => {
    this.renderer.unload()
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

  get layoutPosition() {
    return this.spineItemLayout.layoutPosition
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
    return this.renderer.renditionLayout
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
  element.classList.add(`spineItem-${item.renditionLayout ?? "reflowable"}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
  `

  hookManager.execute("item.onBeforeContainerCreated", undefined, { element })

  return element
}
