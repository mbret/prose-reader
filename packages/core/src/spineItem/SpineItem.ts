import { merge, type Observable } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  first,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { Manifest } from ".."
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { getSpineItemNumberOfPages } from "./layout/getSpineItemNumberOfPages"
import { DefaultRenderer } from "./renderer/DefaultRenderer"
import type { DocumentRenderer } from "./renderer/DocumentRenderer"
import { ResourceHandler } from "./resources/ResourceHandler"
import { SpineItemLayout } from "./SpineItemLayout"

export type SpineItemReference = string | SpineItem | number

type SpineItemState = {
  isLoaded: boolean
  /**
   * - Content has been loaded
   * - A first layout has been done
   */
  isReady: boolean
  /**
   * - Layout has been requested
   * - Item layout not done yet
   */
  iDirty: boolean
}

export class SpineItem extends ReactiveEntity<SpineItemState> {
  public readonly containerElement: HTMLElement
  public readonly needsLayout$: Observable<unknown>
  public readonly renderer: DocumentRenderer
  public readonly resourcesHandler: ResourceHandler
  public readonly layout: SpineItemLayout

  constructor(
    public item: Manifest[`spineItems`][number],
    public parentElement: HTMLElement,
    public context: Context,
    public settings: ReaderSettingsManager,
    public hookManager: HookManager,
    public index: number,
  ) {
    super({
      isLoaded: false,
      isReady: false,
      iDirty: false,
    })

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

    this.layout = new SpineItemLayout(
      item,
      this.containerElement,
      context,
      hookManager,
      this.renderer,
      this.settings,
    )

    const updateStateOnLoaded$ = this.renderer.state$.pipe(
      tap((state) => {
        this.mergeCompare({
          isLoaded: state === "loaded",
        })
      }),
    )

    const updateStateOnLayout$ = this.layout.layout$.pipe(
      tap(() => {
        this.mergeCompare({
          iDirty: false,
          isReady: this.renderer.state$.value === "loaded",
        })
      }),
    )

    this.needsLayout$ = merge(this.unloaded$, this.loaded$)

    merge(
      /**
       * @important
       * The order is important here. We want to ensure the state value
       * is set before dispatching the layout event. Elements reacting
       * to layout changes may rely on the state value to be updated.
       */
      updateStateOnLoaded$,
      updateStateOnLayout$,
      this.layout.layout$,
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  load = () => {
    this.renderer.load()
  }

  unload = () => {
    this.renderer.unload()
  }

  public markDirty = () => {
    this.mergeCompare({
      iDirty: true,
    })
  }

  /**
   * Renderer loaded + spine item layout done
   * Will switch back and forth every new layout.
   */
  public get isReady$() {
    return this.watch(`isReady`)
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
    return this.renderer.loaded$
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

  get numberOfPages() {
    return getSpineItemNumberOfPages({
      isUsingVerticalWriting: !!this.isUsingVerticalWriting(),
      itemHeight: this.layout.layoutInfo.height,
      itemWidth: this.layout.layoutInfo.width,
      pageWidth: this.context.getPageSize().width,
      pageHeight: this.context.getPageSize().height,
      pageTurnDirection: this.settings.values.computedPageTurnDirection,
      pageTurnMode: this.settings.values.pageTurnMode,
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
  element.classList.add(`spineItem-${item.renditionLayout ?? "reflowable"}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
  `
  // biome-ignore lint/complexity/useLiteralKeys: TODO
  element.dataset["isReady"] = `false`

  hookManager.execute("item.onBeforeContainerCreated", undefined, { element })

  return element
}
