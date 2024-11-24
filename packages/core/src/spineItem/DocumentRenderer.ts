import { Manifest } from "@prose-reader/shared"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  endWith,
  filter,
  first,
  map,
  merge,
  Observable,
  of,
  share,
  Subject,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { ResourceHandler } from "./ResourceHandler"
import { waitForSwitch } from "../utils/rxjs"

type Layer = {
  element: HTMLElement
}

export type DocumentRendererParams = {
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  resourcesHandler: ResourceHandler
}

export abstract class DocumentRenderer {
  private triggerSubject = new Subject<`load` | `unload` | `destroy`>()

  protected context: Context
  protected settings: ReaderSettingsManager
  protected hookManager: HookManager
  protected item: Manifest[`spineItems`][number]
  protected containerElement: HTMLElement
  protected resourcesHandler: ResourceHandler
  protected stateSubject = new BehaviorSubject<
    `idle` | `loading` | `loaded` | `unloading` | `ready`
  >(`idle`)

  protected unload$ = this.triggerSubject.pipe(
    withLatestFrom(this.stateSubject),
    filter(
      ([trigger, state]) =>
        trigger === `unload` && state !== "idle" && state !== "unloading",
    ),
    map(() => undefined),
    share(),
  )

  protected load$ = this.triggerSubject.pipe(
    withLatestFrom(this.stateSubject),
    filter(
      ([trigger, state]) =>
        trigger === `load` &&
        state !== "ready" &&
        state !== "loaded" &&
        state !== "loading",
    ),
    map(() => undefined),
    share(),
  )

  public layers: Layer[] = []

  constructor(params: {
    context: Context
    settings: ReaderSettingsManager
    hookManager: HookManager
    item: Manifest[`spineItems`][number]
    containerElement: HTMLElement
    resourcesHandler: ResourceHandler
  }) {
    this.context = params.context
    this.settings = params.settings
    this.hookManager = params.hookManager
    this.item = params.item
    this.containerElement = params.containerElement
    this.resourcesHandler = params.resourcesHandler

    // this.stateSubject.subscribe((state) => {
    //   console.log(`FOOO`, item.id, `state`, state)
    // })

    this.load$
      .pipe(
        switchMap(() => {
          this.stateSubject.next(`loading`)

          const createDocument$ = this.onCreateDocument().pipe(
            endWith(null),
            first(),
          )

          return createDocument$.pipe(
            tap(() => {
              this.hookManager.execute(`item.onDocumentCreated`, this.item.id, {
                itemId: this.item.id,
                layers: this.layers,
              })
            }),
            switchMap(() => {
              const loadDocument$ = this.onLoadDocument().pipe(
                endWith(null),
                first(),
              )

              return loadDocument$
            }),
            waitForSwitch(this.context.bridgeEvent.viewportFree$),
            switchMap(() => {
              const hookResults = this.hookManager
                .execute(`item.onDocumentLoad`, this.item.id, {
                  itemId: this.item.id,
                  layers: this.layers,
                })
                .filter(
                  (result): result is Observable<void> =>
                    result instanceof Observable,
                )

              return combineLatest([of(null), ...hookResults]).pipe(first())
            }),
            tap(() => {
              this.stateSubject.next(`loaded`)
              this.stateSubject.next(`ready`)
            }),
            takeUntil(merge(this.destroy$, this.unload$)),
          )
        }),
      )
      .subscribe()

    this.unload$
      .pipe(
        switchMap(() => {
          this.stateSubject.next(`unloading`)

          return this.context.bridgeEvent.viewportFree$.pipe(
            first(),
            tap(() => {
              this.hookManager.destroy(`item.onDocumentLoad`, this.item.id)
            }),
            switchMap(() => {
              const unload$ = this.onUnload().pipe(endWith(null), first())

              return unload$
            }),
            tap(() => {
              this.stateSubject.next(`idle`)
            }),
            takeUntil(merge(this.destroy$, this.load$)),
          )
        }),
      )
      .subscribe()
  }

  protected destroy$ = this.triggerSubject.pipe(
    filter((trigger) => trigger === `destroy`),
  )

  public get state$() {
    return this.stateSubject
  }

  public load() {
    this.triggerSubject.next(`load`)
  }

  public unload() {
    this.triggerSubject.next(`unload`)
  }

  public destroy() {
    this.triggerSubject.next(`destroy`)
    this.triggerSubject.complete()
    this.stateSubject.complete()
  }

  abstract onUnload(): Observable<unknown>
  /**
   * This lifecycle lets you fetch your resource and create the document.
   * You can fill the layers with your document(s). You can also preload or
   * load any resources that you need as well.
   *
   * @important Do not attach anything to the dom yet.
   */
  abstract onCreateDocument(): Observable<unknown>
  /**
   * This lifecycle lets you load whatever you need once the document is attached to
   * the dom. Some operations can only be done at this stage (eg: loading iframe).
   *
   * @important By the end of your stream, the layers should be attached to the dom.
   */
  abstract onLoadDocument(): Observable<unknown>

  abstract layout(params: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }): { width: number; height: number } | undefined

  get writingMode(): `vertical-rl` | `horizontal-tb` | undefined {
    return undefined
  }

  get readingDirection(): `rtl` | `ltr` | undefined {
    return undefined
  }
}

export class DefaultRenderer extends DocumentRenderer {
  onUnload(): Observable<unknown> {
    return EMPTY
  }

  onCreateDocument(): Observable<unknown> {
    return EMPTY
  }

  onLoadDocument(): Observable<unknown> {
    return EMPTY
  }

  layout() {
    return undefined
  }
}
