import { detectMimeTypeFromName } from "@prose-reader/shared"
import { DocumentRenderer } from "../../../spineItem/renderer/DocumentRenderer"
import { EMPTY, from, map, of, switchMap, tap } from "rxjs"
import { createFrameElement } from "./createFrameElement"
import { attachFrameSrc } from "./attachFrameSrc"
import { waitForSwitch } from "../../../utils/rxjs"
import { waitForFrameLoad, waitForFrameReady } from "../../../utils/frames"
import { renderPrePaginated } from "./prePaginated/renderPrePaginated"
import { renderReflowable } from "./reflowable/renderReflowable"
import { loadAssets, unloadMedias } from "./assets"

export class HtmlRenderer extends DocumentRenderer {
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

  onCreateDocument() {
    const frameElement = createFrameElement()

    this.layers = [
      {
        element: frameElement,
      },
    ]

    return EMPTY
  }

  onLoadDocument() {
    const frameElement = this.getFrameElement()

    if (!frameElement) throw new Error(`invalid frame`)

    return of(frameElement).pipe(
      attachFrameSrc({
        item: this.item,
        resourcesHandler: this.resourcesHandler,
        settings: this.settings,
      }),
      waitForSwitch(this.context.bridgeEvent.viewportFree$),
      tap((frameElement) => {
        this.containerElement.appendChild(frameElement)
      }),
      waitForFrameLoad,
      loadAssets({
        context: this.context,
        item: this.item,
        settings: this.settings,
      }),
      waitForFrameReady,
    )
  }

  onUnload() {
    unloadMedias(this.getFrameElement())

    this.layers.forEach((layer) => layer.element.remove())
    this.layers = []

    return EMPTY
  }

  onLayout({
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

    if (!frameElement) return of(undefined)

    const isUsingVerticalWriting = !!this.writingMode?.startsWith(`vertical`)

    if (
      this.item.renditionLayout === `pre-paginated` ||
      (!this.item.renditionLayout &&
        this.context.manifest?.renditionLayout === `pre-paginated`)
    ) {
      const dims = renderPrePaginated({
        blankPagePosition,
        enableTouch: this.settings.values.computedPageTurnMode !== `scrollable`,
        frameElement,
        isRTL: this.context.isRTL(),
        minPageSpread,
        pageHeight,
        pageWidth,
        spreadPosition,
      })

      return of(dims)
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

    return of(rest)
  }

  onRenderHeadless() {
    return from(this.resourcesHandler.fetchResource()).pipe(
      switchMap((resource) => {
        if (resource instanceof Response) {
          const contentType = resource.headers.get("content-type") ?? ""
          const parsableContentTypes: DOMParserSupportedType[] = [
            `application/xhtml+xml`,
            `application/xml`,
            `text/html`,
            `text/xml`,
          ]

          if (
            parsableContentTypes.includes(contentType as DOMParserSupportedType)
          ) {
            return from(resource.text()).pipe(
              map((text) => {
                const domParser = new DOMParser()
                const doc = domParser.parseFromString(
                  text,
                  contentType as DOMParserSupportedType,
                )

                return doc
              }),
            )
          }
        }

        return of(undefined)
      }),
    )
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

  getDocumentFrame() {
    return this.getFrameElement()
  }
}
