import { merge } from "rxjs"
import { share, takeUntil, tap } from "rxjs/operators"
import type { Manifest } from ".."
import { HTML_PREFIX_SPINE_ITEM } from "../constants"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import type { Viewport } from "../viewport/Viewport"
import { getSpineItemNumberOfPages } from "./layout/getSpineItemNumberOfPages"
import { DefaultRenderer } from "./renderer/DefaultRenderer"
import type { DocumentRenderer } from "./renderer/DocumentRenderer"
import { ResourceHandler } from "./resources/ResourceHandler"
import { SpineItemLayout } from "./SpineItemLayout"

export type SpineItemReference = string | SpineItem | number

export type SpineItemState = {
  isLoaded: boolean
  /**
   * - Content has been loaded
   * - A first layout has been done
   */
  isReady: boolean
  isError: boolean
  error: unknown | undefined
  /**
   * - Layout has been requested
   * - Item layout not done yet
   */
  isDirty: boolean
}

export class SpineItem extends ReactiveEntity<SpineItemState> {
  public readonly containerElement: HTMLElement
  public readonly renderer: DocumentRenderer
  public readonly resourcesHandler: ResourceHandler

  /**
   * Dispatched once the item has fully did layout. State is also updated before the dispatch.
   * - not dirty
   * - ready (if loaded)
   * - element adjusted
   */
  public readonly didLayout$: SpineItemLayout["didLayout$"]

  private readonly _layout: SpineItemLayout

  constructor(
    public item: Manifest[`spineItems`][number],
    public context: Context,
    public settings: ReaderSettingsManager,
    public hookManager: HookManager,
    public readonly index: number,
    public viewport: Viewport,
  ) {
    super({
      isLoaded: false,
      isReady: false,
      isDirty: false,
      isError: false,
      error: undefined,
    })

    this.containerElement = createContainerElement(item, context.document)

    const rendererFactory = this.settings.values.getRenderer?.(item)

    this.resourcesHandler = new ResourceHandler(item, this.settings)

    const rendererParams = {
      context,
      settings,
      hookManager,
      item,
      containerElement: this.containerElement,
      resourcesHandler: this.resourcesHandler,
      viewport: this.viewport,
    }

    this.renderer = rendererFactory
      ? rendererFactory(rendererParams)
      : new DefaultRenderer(rendererParams)

    this._layout = new SpineItemLayout(
      item,
      this.containerElement,
      context,
      hookManager,
      this.renderer,
      this.settings,
      this.viewport,
    )

    const updateStateOnLoaded$ = this.renderer.state$.pipe(
      tap(({ state, error }) => {
        this.mergeCompare({
          isLoaded: state === "loaded",
          isError: state === "error",
          error: state === "error" ? error : undefined,
        })
      }),
    )

    this.didLayout$ = this._layout.didLayout$.pipe(
      tap(() => {
        this.mergeCompare({
          isDirty: false,
          isReady: this.renderer.value.state === "loaded",
        })
      }),
      share(),
    )

    merge(
      /**
       * @important
       * The order is important here. We want to ensure the state value
       * is set before dispatching the layout event. Elements reacting
       * to layout changes may rely on the state value to be updated.
       */
      updateStateOnLoaded$,
      this.didLayout$,
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /**
   * Attach the item container to the spine element. Deferred from construction
   * so that `item.onBeforeContainerAttach` hooks registered between
   * `createReader()` and `mount()` are honored. The container is built in the
   * reader's document (see `context.document`), so it already belongs to the
   * mount document when the hook runs.
   */
  attach = (parentElement: HTMLElement) => {
    this.hookManager.execute(`item.onBeforeContainerAttach`, {
      element: this.containerElement,
      item: this.item,
    })

    parentElement.appendChild(this.containerElement)
  }

  load = () => {
    this.renderer.load()
  }

  unload = () => {
    this.renderer.unload()
  }

  public markDirty = () => {
    this.mergeCompare({
      isDirty: true,
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
    if (this.isDestroyed) return

    super.destroy()

    this._layout.destroy()
    // the renderer needs the container attached to release its resources
    // (eg: revoking blobs requires a live frame document)
    this.renderer.destroy()
    this.containerElement.remove()
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

  /**
   * Note that this is dispatched AFTER the state has been updated.
   */
  get loaded$() {
    return this.renderer.loaded$
  }

  /**
   * Note that this is dispatched AFTER the state has been updated.
   */
  get unloaded$() {
    return this.renderer.unloaded$
  }

  get renditionLayout() {
    return this.renderer.renditionLayout
  }

  get layoutInfo() {
    return this._layout.layoutInfo
  }

  get numberOfPages() {
    return getSpineItemNumberOfPages({
      isUsingVerticalWriting: !!this.isUsingVerticalWriting(),
      itemHeight: this._layout.layoutInfo.height,
      itemWidth: this._layout.layoutInfo.width,
      pageWidth: this.viewport.pageSize.width,
      pageHeight: this.viewport.pageSize.height,
      pageTurnDirection: this.settings.values.computedPageTurnDirection,
      pageTurnMode: this.settings.values.pageTurnMode,
    })
  }

  public layout: SpineItemLayout["layout"] = (params) => {
    return this._layout.layout(params)
  }
}

const createContainerElement = (
  item: Manifest[`spineItems`][number],
  ownerDocument: Document,
) => {
  const element: HTMLElement = ownerDocument.createElement(`div`)
  element.setAttribute(`data-${HTML_PREFIX_SPINE_ITEM}`, "")
  element.classList.add(`spineItem`)
  element.classList.add(`spineItem-${item.renditionLayout ?? "reflowable"}`)
  element.style.cssText = `
    position: absolute;
    overflow: hidden;
  `
  // biome-ignore lint/complexity/useLiteralKeys: TODO
  element.dataset["isReady"] = `false`

  return element
}
