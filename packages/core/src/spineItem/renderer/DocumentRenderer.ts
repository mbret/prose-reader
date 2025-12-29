import type { Manifest } from "@prose-reader/shared"
import {
  catchError,
  combineLatest,
  defer,
  EMPTY,
  endWith,
  filter,
  finalize,
  first,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  Subject,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { getFrameViewportInfo } from "../../utils/frames"
import { ReactiveEntity } from "../../utils/ReactiveEntity"
import { waitForSwitch } from "../../utils/rxjs"
import type { Viewport } from "../../viewport/Viewport"
import type { ResourceHandler } from "../resources/ResourceHandler"

export type DocumentRendererParams = {
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  resourcesHandler: ResourceHandler
  viewport: Viewport
}

type LayoutParams = {
  minPageSpread: number
  blankPagePosition: `before` | `after` | `none`
  spreadPosition: `none` | `left` | `right`
  minimumWidth: number
}

type DocumentRendererState =
  | {
      state: `error`
      error: unknown
    }
  | {
      state: `idle` | `loading` | `loaded` | `unloading`
      error: undefined
    }

export abstract class DocumentRenderer extends ReactiveEntity<DocumentRendererState> {
  static readonly DOCUMENT_CONTAINER_CLASS_NAME =
    `prose-reader-document-container`
  private triggerSubject = new Subject<{ type: `load` } | { type: `unload` }>()

  protected viewport: Viewport
  protected context: Context
  protected settings: ReaderSettingsManager
  protected hookManager: HookManager
  protected item: Manifest[`spineItems`][number]
  protected containerElement: HTMLElement
  protected resourcesHandler: ResourceHandler

  // protected unload$ = this.triggerSubject.pipe(
  //   withLatestFrom(this.stateSubject),
  //   filter(
  //     ([trigger, state]) =>
  //       trigger.type === `unload` && state.state !== "idle" && state.state !== "unloading",
  //   ),
  //   map(() => undefined),
  //   share(),
  // )

  // protected load$ = this.triggerSubject.pipe(
  //   withLatestFrom(this.stateSubject),
  //   filter(
  //     ([trigger, state]) =>
  //       trigger.type === `load` && state.state !== "loaded" && state.state !== "loading",
  //   ),
  //   map(() => undefined),
  //   share(),
  // )

  public loaded$: Observable<void>

  private _documentContainer: HTMLElement | undefined

  constructor(params: {
    context: Context
    settings: ReaderSettingsManager
    hookManager: HookManager
    item: Manifest[`spineItems`][number]
    containerElement: HTMLElement
    resourcesHandler: ResourceHandler
    viewport: Viewport
  }) {
    super({
      state: `idle`,
      error: undefined,
    })

    this.context = params.context
    this.settings = params.settings
    this.hookManager = params.hookManager
    this.item = params.item
    this.containerElement = params.containerElement
    this.resourcesHandler = params.resourcesHandler
    this.viewport = params.viewport

    const unloadTrigger$ = this.triggerSubject.pipe(
      filter((trigger) => trigger.type === `unload`),
    )

    const loadTrigger$ = this.triggerSubject.pipe(
      filter((trigger) => trigger.type === `load`),
    )

    this.loaded$ = loadTrigger$.pipe(
      mergeMap(() => {
        const canBeIgnored =
          this.value.state === `loaded` || this.value.state === `loading`

        if (canBeIgnored) return EMPTY

        this.next({ state: `loading`, error: undefined })

        const createDocument$ = this.onCreateDocument().pipe(first())

        return createDocument$.pipe(
          mergeMap((documentContainer) => {
            this.hookManager.execute(`item.onDocumentCreated`, this.item.id, {
              itemId: this.item.id,
              documentContainer,
            })

            const loadDocument$ = this.onLoadDocument().pipe(
              endWith(null),
              first(),
            )

            return loadDocument$.pipe(
              waitForSwitch(this.context.bridgeEvent.viewportFree$),
              switchMap(() => {
                const hookResults = this.hookManager
                  .execute(`item.onDocumentLoad`, this.item.id, {
                    itemId: this.item.id,
                    documentContainer,
                  })
                  .filter(
                    (result): result is Observable<void> =>
                      result instanceof Observable,
                  )

                return combineLatest([of(null), ...hookResults]).pipe(first())
              }),
            )
          }),
          map(() => {
            this.next({ state: `loaded`, error: undefined })

            return undefined
          }),
          takeUntil(unloadTrigger$),
        )
      }),
      share(),
    )

    const unload$ = unloadTrigger$.pipe(
      mergeMap(() => {
        const canBeIgnored =
          this.value.state === `unloading` || this.value.state === `idle`

        if (canBeIgnored) return EMPTY

        this.next({ state: `unloading`, error: undefined })

        return this.context.bridgeEvent.viewportFree$.pipe(
          first(),
          switchMap(() => {
            this.hookManager.destroy(`item.onDocumentLoad`, this.item.id)

            const onUnload$ = this.onUnload().pipe(endWith(null), first())

            return onUnload$
          }),
          tap(() => {
            this.next({ state: `idle`, error: undefined })
          }),
          takeUntil(loadTrigger$),
        )
      }),
    )

    merge(this.loaded$, unload$)
      .pipe(
        catchError((error) => {
          this.next({ state: `error`, error })

          return EMPTY
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  protected setDocumentContainer(element: HTMLElement) {
    this._documentContainer = element
    this._documentContainer.classList.add(
      DocumentRenderer.DOCUMENT_CONTAINER_CLASS_NAME,
    )
  }

  protected attach() {
    if (this.documentContainer) {
      this.containerElement.appendChild(this.documentContainer)
    }
  }

  protected detach() {
    this._documentContainer?.remove()
    this._documentContainer = undefined
  }

  public get state$() {
    return this.stateSubject
  }

  public get isLoaded$() {
    return this.state$.pipe(map((state) => state.state === `loaded`))
  }

  public load() {
    this.triggerSubject.next({ type: `load` })
  }

  public unload() {
    this.triggerSubject.next({ type: `unload` })
  }

  /**
   * Automatically release on complete or error.
   */
  public renderHeadless(): Observable<
    { doc: Document; release: () => void } | undefined
  > {
    const releaseSubject = new Subject<void>()

    return defer(() => this.onRenderHeadless({ release: releaseSubject })).pipe(
      endWith(undefined),
      first(),
      map((doc) => {
        if (!doc) return undefined

        return {
          doc,
          release: () => {
            releaseSubject.next(undefined)
          },
        }
      }),
      finalize(() => {
        releaseSubject.complete()
      }),
      catchError((e) => {
        Report.error(e)

        return of(undefined)
      }),
    )
  }

  public layout(params: LayoutParams) {
    return this.onLayout(params)
  }

  public destroy() {
    this.unload()
    this.stateSubject.complete()

    super.destroy()
  }

  abstract onRenderHeadless(params: {
    release: Observable<void>
  }): Observable<Document | undefined>

  abstract onUnload(): Observable<unknown>

  /**
   * This lifecycle lets you fetch your resource and create the document.
   * You can fill the layers with your document(s). You can also preload or
   * load any resources that you need as well.
   *
   * @important Do not attach anything to the dom yet.
   */
  abstract onCreateDocument(): Observable<HTMLElement>

  /**
   * This lifecycle lets you load whatever you need once the document is attached to
   * the dom. Some operations can only be done at this stage (eg: loading iframe).
   *
   * @important By the end of your stream, the layers should be attached to the dom.
   */
  abstract onLoadDocument(): Observable<unknown>

  abstract onLayout(
    params: LayoutParams,
  ): Observable<{ width: number; height: number } | undefined>

  /**
   * Return the main document iframe.
   */
  abstract getDocumentFrame(): HTMLIFrameElement | undefined

  get documentContainer() {
    return this._documentContainer
  }

  get writingMode(): `vertical-rl` | `horizontal-tb` | undefined {
    return undefined
  }

  get readingDirection(): `rtl` | `ltr` | undefined {
    return undefined
  }

  get renditionLayout() {
    const itemRenditionLayout = this.item.renditionLayout

    if (itemRenditionLayout) return itemRenditionLayout

    const iframe = this.getDocumentFrame()

    if (iframe) {
      const { hasViewport } = getFrameViewportInfo(iframe)

      if (hasViewport) return "pre-paginated"
    }

    return this.context.manifest?.renditionLayout ?? "reflowable"
  }
}
