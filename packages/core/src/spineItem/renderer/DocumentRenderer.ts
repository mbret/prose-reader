import type { Manifest } from "@prose-reader/shared"
import {
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  EMPTY,
  endWith,
  filter,
  finalize,
  first,
  ignoreElements,
  map,
  mergeMap,
  type Observable,
  of,
  Subject,
  share,
  switchMap,
  takeUntil,
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

type DocumentRendererState = {
  state: `idle` | `loading` | `loaded` | `unloading` | `error`
  error: unknown | undefined
  documentContainer: HTMLElement | undefined
}

export abstract class DocumentRenderer extends ReactiveEntity<DocumentRendererState> {
  static readonly DOCUMENT_CONTAINER_CLASS_NAME =
    `prose-reader-document-container`
  /**
   * Every `load()` and `unload()`, in the order they are asked for, until
   * `destroy()` ends them.
   */
  private documentRequestSubject = new Subject<`load` | `unload`>()

  protected viewport: Viewport
  protected context: Context
  protected settings: ReaderSettingsManager
  protected hookManager: HookManager
  protected item: Manifest[`spineItems`][number]
  protected containerElement: HTMLElement
  protected resourcesHandler: ResourceHandler

  public readonly loaded$: Observable<void>
  public readonly unloaded$: Observable<void>

  constructor(params: DocumentRendererParams) {
    super({
      state: `idle`,
      error: undefined,
      documentContainer: undefined,
    })

    this.context = params.context
    this.settings = params.settings
    this.hookManager = params.hookManager
    this.item = params.item
    this.containerElement = params.containerElement
    this.resourcesHandler = params.resourcesHandler
    this.viewport = params.viewport

    const createAndLoadDocument$ = defer(() => {
      this.mergeCompare({ state: `loading`, error: undefined })

      return this.onCreateDocument()
    }).pipe(
      first(),
      mergeMap((documentContainer) => {
        this.hookManager.execute(`item.onDocumentCreated`, {
          itemId: this.item.id,
          documentContainer,
        })

        const loadDocument$ = this.onLoadDocument().pipe(endWith(null), first())

        return loadDocument$.pipe(
          waitForSwitch(this.context.bridgeEvent.viewportFree$),
          switchMap(() =>
            this.hookManager.fromExecuteAsync(
              `item.onDocumentLoad`,
              this.item.id,
              {
                itemId: this.item.id,
                documentContainer,
              },
            ),
          ),
        )
      }),
      map(() => {
        this.mergeCompare({ state: `loaded`, error: undefined })

        return `loaded` as const
      }),
      /**
       * A load that fails leaves the renderer in `error`, with what it
       * created released, and the lifecycle going on: the spine lays out on
       * every item's `loaded$`, and one ending in an error would stop its
       * layouts for good.
       */
      catchError((error) => {
        Report.error(`Error loading document`, error)
        this.releaseDocument()
        this.mergeCompare({ state: `error`, error })

        return EMPTY
      }),
    )

    /**
     * Releases the document once the viewport is free, so the release does
     * not compete with a navigation. Without a document there is nothing to
     * release: none was loaded, or its failed load released it.
     */
    const unload$ = defer(() => {
      if (!this.holdsDocument) {
        this.mergeCompare({ state: `idle`, error: undefined })

        return EMPTY
      }

      this.mergeCompare({ state: `unloading`, error: undefined })

      return this.context.bridgeEvent.viewportFree$.pipe(
        first(),
        map(() => {
          this.releaseDocument()
          this.mergeCompare({ state: `idle`, error: undefined })

          return `unloaded` as const
        }),
      )
    })

    /**
     * A renderer holds one document at a time: a load unloads what is held
     * first, so a load asked for while the document waits for the viewport to
     * release it waits for that release, then creates a new one.
     */
    const load$ = concat(unload$, createAndLoadDocument$)

    /** Emits once `destroy()` has ended the requests. */
    const endOfRequests$ = this.documentRequestSubject.pipe(
      ignoreElements(),
      endWith(null),
    )

    const documentLifecycle$ = this.documentRequestSubject.pipe(
      /**
       * A request says whether the document should be there, so asking again
       * for what the latest request asked for changes nothing: a load while
       * the document is loading, loaded or failed to load, an unload while it
       * is released or waits to be.
       */
      distinctUntilChanged(),
      /**
       * A request replaces the one before it, which stops first: an unload
       * cancels a load in progress before its document is released.
       */
      switchMap((request) => (request === `load` ? load$ : unload$)),
      /**
       * Once the requests end, what runs for the last one stops as well,
       * whoever listens to `loaded$` or `unloaded$`: a load in progress, or a
       * release waiting for the viewport.
       */
      takeUntil(endOfRequests$),
      share(),
    )

    this.loaded$ = documentLifecycle$.pipe(
      filter((event) => event === `loaded`),
      map(() => undefined),
    )

    this.unloaded$ = documentLifecycle$.pipe(
      filter((event) => event === `unloaded`),
      map(() => undefined),
    )

    documentLifecycle$.subscribe()
  }

  /**
   * Whether what a load creates is held: from the start of the load until it
   * is released. A load that fails releases it at once.
   */
  private get holdsDocument() {
    const { state } = this.value

    return state === `loading` || state === `loaded` || state === `unloading`
  }

  /**
   * Runs the unload hooks on the document container, when there is one, then
   * `onUnload`. Synchronous, so `destroy` can release a document before its
   * caller detaches the container. A step that throws is reported, and does
   * not keep the next one from running.
   */
  private releaseDocument() {
    const documentContainer = this.value.documentContainer

    if (documentContainer) {
      try {
        this.hookManager.execute(`item.onDocumentUnload`, {
          itemId: this.item.id,
          documentContainer,
        })
      } catch (error) {
        Report.error(`Error unloading document`, error)
      }
    }

    try {
      this.onUnload()
    } catch (error) {
      Report.error(`Error unloading document`, error)
    }
  }

  protected setDocumentContainer(element: HTMLElement) {
    element.classList.add(DocumentRenderer.DOCUMENT_CONTAINER_CLASS_NAME)
    this.mergeCompare({ documentContainer: element })
  }

  protected attach() {
    if (this.documentContainer) {
      this.containerElement.appendChild(this.documentContainer)
    }
  }

  protected detach() {
    this.documentContainer?.remove()
    this.mergeCompare({ documentContainer: undefined })
  }

  public get isLoaded$() {
    return this.state$.pipe(map((state) => state.state === `loaded`))
  }

  /**
   * Asks for the document to be loaded. It is not loaded again while it is
   * loaded, loading, or its load failed: a failed load stays failed until
   * `unload()`. While the document waits for the viewport to release it, the
   * load waits for that release, then loads a new document.
   */
  public load() {
    this.documentRequestSubject.next(`load`)
  }

  /**
   * Asks for the document to be released, once the viewport is free. A load
   * in progress is cancelled first. A `load()` that comes before the release
   * does not keep the document: it loads a new one after the release. After
   * a failed load there is nothing left to release, and the renderer only
   * becomes idle.
   */
  public unload() {
    this.documentRequestSubject.next(`unload`)
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
    if (this.isDestroyed) return

    /**
     * Ends the requests first: a load in progress, or a release waiting for
     * the viewport, stops, and a request made from here on changes nothing.
     */
    this.documentRequestSubject.complete()

    /**
     * Then releases what is held at once, rather than once the viewport is
     * free, so resources (eg: blob urls) are released deterministically: the
     * caller detaches the container right after, and the unload hooks still
     * observe the live document. The state has not completed yet, so what
     * observes it sees the document go. The spine is not laid out for it.
     */
    if (this.holdsDocument) this.releaseDocument()

    super.destroy()
  }

  abstract onRenderHeadless(params: {
    release: Observable<void>
  }): Observable<Document | undefined>

  /**
   * Release the document and its resources. Called once for each load, to
   * release what it created: when the document is unloaded, when its load
   * fails, or on `destroy`. A load still in progress is cancelled first, and
   * one cancelled before its document was created is released too, with
   * nothing to release.
   *
   * Must be synchronous: unload also runs during a synchronous `destroy`,
   * before the caller detaches the container, so any deferred work would run
   * against a torn-down document.
   */
  abstract onUnload(): void

  /**
   * This lifecycle lets you fetch your resource and create the document.
   * You can fill the layers with your document(s). You can also preload or
   * load any resources that you need as well.
   *
   * A renderer holds one document at a time: this is only called once the
   * previous document, if any, has been released by `onUnload`.
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
    return this.value.documentContainer
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

    return this.context.manifest.renditionLayout ?? "reflowable"
  }
}
