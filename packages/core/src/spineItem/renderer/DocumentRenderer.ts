import type { Manifest } from "@prose-reader/shared"
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  defer,
  endWith,
  filter,
  finalize,
  first,
  map,
  merge,
  mergeMap,
  of,
  share,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { DestroyableClass } from "../../utils/DestroyableClass"
import { getFrameViewportInfo } from "../../utils/frames"
import { waitForSwitch } from "../../utils/rxjs"
import type { ResourceHandler } from "../resources/ResourceHandler"

export type DocumentRendererParams = {
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  resourcesHandler: ResourceHandler
}

type LayoutParams = {
  minPageSpread: number
  blankPagePosition: `before` | `after` | `none`
  spreadPosition: `none` | `left` | `right`
  minimumWidth: number
}

export abstract class DocumentRenderer extends DestroyableClass {
  private triggerSubject = new Subject<{ type: `load` } | { type: `unload` }>()

  protected context: Context
  protected settings: ReaderSettingsManager
  protected hookManager: HookManager
  protected item: Manifest[`spineItems`][number]
  protected containerElement: HTMLElement
  protected resourcesHandler: ResourceHandler
  protected stateSubject = new BehaviorSubject<
    `idle` | `loading` | `loaded` | `unloading`
  >(`idle`)

  protected unload$ = this.triggerSubject.pipe(
    withLatestFrom(this.stateSubject),
    filter(
      ([trigger, state]) =>
        trigger.type === `unload` && state !== "idle" && state !== "unloading",
    ),
    map(() => undefined),
    share(),
  )

  protected load$ = this.triggerSubject.pipe(
    withLatestFrom(this.stateSubject),
    filter(
      ([trigger, state]) =>
        trigger.type === `load` && state !== "loaded" && state !== "loading",
    ),
    map(() => undefined),
    share(),
  )

  public documentContainer: HTMLElement | undefined

  constructor(params: {
    context: Context
    settings: ReaderSettingsManager
    hookManager: HookManager
    item: Manifest[`spineItems`][number]
    containerElement: HTMLElement
    resourcesHandler: ResourceHandler
  }) {
    super()

    this.context = params.context
    this.settings = params.settings
    this.hookManager = params.hookManager
    this.item = params.item
    this.containerElement = params.containerElement
    this.resourcesHandler = params.resourcesHandler

    const unloadTrigger$ = this.triggerSubject.pipe(
      withLatestFrom(this.stateSubject),
      filter(
        ([trigger, state]) =>
          trigger.type === `unload` &&
          state !== "idle" &&
          state !== "unloading",
      ),
      map(() => undefined),
      share(),
    )

    this.load$
      .pipe(
        switchMap(() => {
          this.stateSubject.next(`loading`)

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
            tap(() => {
              this.stateSubject.next(`loaded`)
            }),
            takeUntil(merge(this.destroy$, unloadTrigger$)),
          )
        }),
      )
      .subscribe()

    const unload$ = unloadTrigger$.pipe(
      switchMap(() => {
        this.stateSubject.next(`unloading`)

        return this.context.bridgeEvent.viewportFree$.pipe(
          first(),
          tap(() => {
            this.hookManager.destroy(`item.onDocumentLoad`, this.item.id)
          }),
          switchMap(() => {
            const onUnload$ = this.onUnload().pipe(endWith(null), first())

            return onUnload$
          }),
          tap(() => {
            this.stateSubject.next(`idle`)
          }),
          takeUntil(this.load$),
        )
      }),
    )

    merge(unload$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  protected attach() {
    if (this.documentContainer) {
      this.containerElement.appendChild(this.documentContainer)
    }
  }

  protected detach() {
    this.documentContainer?.remove()
    this.documentContainer = undefined
  }

  public get state$() {
    return this.stateSubject
  }

  public get isLoaded$() {
    return this.state$.pipe(map((state) => state === `loaded`))
  }

  public load() {
    this.triggerSubject.next({ type: `load` })
  }

  public unload() {
    this.triggerSubject.next({ type: `unload` })
  }

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
    return defer(() => this.onLayout(params)).pipe()
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
