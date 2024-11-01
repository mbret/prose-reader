import { detectMimeTypeFromName, Manifest } from "@prose-reader/shared"
import { Context } from "../../../context/Context"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import { renderPrePaginated } from "./prePaginated/renderPrePaginated"
import { Renderer } from "../Renderer"
import { ResourceHandler } from "../../ResourceHandler"
import {
  combineLatest,
  first,
  map,
  merge,
  Observable,
  of,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { createFrameElement } from "./createFrameElement"
import { attachFrameSrc } from "./attachFrameSrc"
import { waitForSwitch } from "../../../utils/rxjs"
import { waitForFrameLoad, waitForFrameReady } from "../../../utils/frames"
import { renderReflowable } from "./reflowable/renderReflowable"

export class HtmlRenderer extends Renderer {
  /**
   * This value is being used to avoid item to shrink back to smaller size when getting a layout after
   * the content has been loaded.
   * This means when previous content get unload, the user does not end up farther than he should be due to previous content
   * shrinking.
   *
   * @important
   * For now it's only used for continuous-scroll as experimental test. This could potentially solve the sliding
   * issue with reflow content as wel.
   */
  latestContentHeightWhenLoaded: number | undefined

  constructor(
    context: Context,
    settings: ReaderSettingsManager,
    hookManager: HookManager,
    item: Manifest[`spineItems`][number],
    containerElement: HTMLElement,
    resourcesHandler: ResourceHandler,
  ) {
    super(
      context,
      settings,
      hookManager,
      item,
      containerElement,
      resourcesHandler,
    )

    this.load$
      .pipe(
        switchMap(() => {
          this.stateSubject.next(`loading`)

          return of(createFrameElement()).pipe(
            tap((frameElement) => {
              this.layers = [
                {
                  element: frameElement,
                },
              ]

              this.hookManager.execute(`item.onDocumentCreated`, item.id, {
                itemId: this.item.id,
                layers: this.layers,
              })
            }),
            attachFrameSrc({
              item: this.item,
              resourcesHandler: this.resourcesHandler,
              settings: this.settings,
            }),
            waitForSwitch(context.bridgeEvent.viewportFree$),
            tap((frameElement) => {
              containerElement.appendChild(frameElement)
            }),
            waitForFrameLoad,
            waitForSwitch(context.bridgeEvent.viewportFree$),
            switchMap((frameElement) => {
              const hookResults = hookManager
                .execute(`item.onDocumentLoad`, item.id, {
                  itemId: item.id,
                  frame: frameElement,
                })
                .filter(
                  (result): result is Observable<void> =>
                    result instanceof Observable,
                )

              return combineLatest([of(null), ...hookResults]).pipe(
                map(() => frameElement),
              )
            }),
            tap(() => {
              this.stateSubject.next(`loaded`)
            }),
            waitForFrameReady,
            tap(() => {
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
              hookManager.destroy(`item.onDocumentLoad`, item.id)

              this.layers.forEach((layer) => layer.element.remove())
              this.layers = []

              this.stateSubject.next(`idle`)
            }),
            takeUntil(merge(this.destroy$, this.load$)),
          )
        }),
      )
      .subscribe()
  }

  render({
    minPageSpread,
    blankPagePosition,
    spreadPosition,
  }: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }) {
    const { width: pageWidth, height: pageHeight } = this.context.getPageSize()
    const frameElement = this.getFrameElement()

    if (!frameElement) return { width: pageWidth, height: pageHeight }

    const isUsingVerticalWriting = !!this.writingMode?.startsWith(`vertical`)

    if (this.item.renditionLayout === `pre-paginated`) {
      return renderPrePaginated({
        blankPagePosition,
        enableTouch: this.settings.values.computedPageTurnMode !== `scrollable`,
        frameElement,
        isRTL: this.context.isRTL(),
        minPageSpread,
        pageHeight,
        pageWidth,
        spreadPosition,
      })
    }

    const { latestContentHeightWhenLoaded, ...rest } = renderReflowable({
      pageHeight,
      pageWidth,
      frameElement,
      manifest: this.context.manifest,
      blankPagePosition,
      isUsingVerticalWriting,
      isRTL: this.context.isRTL(),
      latestContentHeightWhenLoaded: this.latestContentHeightWhenLoaded,
      minPageSpread,
      isImageType: this.isImageType(),
      enableTouch: this.settings.values.computedPageTurnMode !== `scrollable`,
    })

    this.latestContentHeightWhenLoaded = latestContentHeightWhenLoaded

    return rest
  }

  private isImageType = () => {
    const mimeType =
      this.item.mediaType ?? detectMimeTypeFromName(this.item.href)

    return !!mimeType?.startsWith(`image/`)
  }

  private getFrameElement() {
    const frame = this.layers[0]?.element

    if (!(frame instanceof HTMLIFrameElement)) return

    return frame
  }

  // @todo optimize
  public getComputedStyleAfterLoad() {
    const frame = this.getFrameElement()

    const body = frame?.contentDocument?.body

    if (body) {
      return frame?.contentWindow?.getComputedStyle(body)
    }
  }

  get writingMode() {
    return this.getComputedStyleAfterLoad()?.writingMode as
      | `vertical-rl`
      | `horizontal-tb`
      | undefined
  }

  get readingDirection() {
    const writingMode = this.writingMode

    if (writingMode === `vertical-rl`) {
      return `rtl`
    }

    const direction = this.getComputedStyleAfterLoad()?.direction

    switch (direction) {
      case `ltr`:
      case `inherit`:
      case `initial`: {
        return `ltr`
      }

      case `rtl`:
        return `rtl`

      default:
        return undefined
    }
  }
}
