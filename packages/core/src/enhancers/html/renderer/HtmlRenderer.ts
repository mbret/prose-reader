import { detectMimeTypeFromName } from "@prose-reader/shared"
import { EMPTY, from, map, of, switchMap, tap } from "rxjs"
import { DocumentRenderer } from "../../../spineItem/renderer/DocumentRenderer"
import {
  upsertCSSToFrame,
  waitForFrameLoad,
  waitForFrameReady,
} from "../../../utils/frames"
import { waitForSwitch } from "../../../utils/rxjs"
import { loadAssets, unloadAssets } from "./assets"
import { attachFrameSrc } from "./attachFrameSrc"
import { createFrameElement } from "./createFrameElement"
import prePaginatedStyle from "./prePaginated/pre-paginated.css?inline"
import { renderPrePaginated } from "./prePaginated/renderPrePaginated"
// import reflowableImageStyle from "./reflowable/reflowable-image.css?inline"
import { renderReflowable } from "./reflowable/renderReflowable"
export class HtmlRenderer extends DocumentRenderer {
  onCreateDocument() {
    const frameElement = createFrameElement()

    this.setDocumentContainer(frameElement)

    return of(frameElement)
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
      tap(() => {
        this.attach()
      }),
      waitForFrameLoad,
      tap((frameElement) => {
        if (this.isPrePaginated()) {
          upsertCSSToFrame(frameElement, `prose-reader-css`, prePaginatedStyle)
        } else {
          if (this.isImageType()) {
            // upsertCSSToFrame(
            //   frameElement,
            //   `prose-reader-css`,
            //   reflowableImageStyle,
            // )
          } else {
            // upsertCSSToFrame(frameElement, `prose-reader-css`, reflowableStyle)
          }
        }
      }),
      loadAssets({
        context: this.context,
        item: this.item,
        settings: this.settings,
      }),
      waitForFrameReady,
    )
  }

  onUnload() {
    unloadAssets(this.getFrameElement())

    this.detach()

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
    const { width: pageWidth, height: pageHeight } = this.viewport.pageSize
    const frameElement = this.getFrameElement()

    if (!frameElement) return of(undefined)

    const isUsingVerticalWriting = !!this.writingMode?.startsWith(`vertical`)

    /**
     * When we have scrollable content, we use "native" touch event from the frame instead of
     * our own gestures.
     * @todo move this into scroll navigator
     */
    const isTouchEnabled =
      this.settings.values.computedPageTurnMode === `scrollable`

    if (frameElement.contentDocument?.documentElement) {
      frameElement.contentDocument?.documentElement.setAttribute(
        `data-prose-reader-html-renderer-spread-position`,
        spreadPosition,
      )
      if (isTouchEnabled) {
        frameElement.contentDocument?.documentElement.classList.add(
          `prose-reader-html-renderer-touch-enabled`,
        )
      } else {
        frameElement.contentDocument?.documentElement.classList.remove(
          `prose-reader-html-renderer-touch-enabled`,
        )
      }
    }

    if (this.isPrePaginated()) {
      const dims = renderPrePaginated({
        blankPagePosition,
        frameElement,
        isRTL: this.context.isRTL(),
        minPageSpread,
        pageHeight,
        pageWidth,
        spreadPosition,
      })

      return of(dims)
    }

    const dims = renderReflowable({
      pageHeight,
      pageWidth,
      frameElement,
      manifest: this.context.manifest,
      blankPagePosition,
      isUsingVerticalWriting,
      isRTL: this.context.isRTL(),
      minPageSpread,
      isImageType: this.isImageType(),
      /**
       * When we have scrollable content, we use "native" touch event from the frame instead of
       * our own gestures.
       * @todo move this into scroll navigator
       */
      enableTouch: this.settings.values.computedPageTurnMode === `scrollable`,
    })

    return of(dims)
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

  private isPrePaginated = () => {
    return (
      this.item.renditionLayout === `pre-paginated` ||
      (!this.item.renditionLayout &&
        this.context.manifest?.renditionLayout === `pre-paginated`)
    )
  }

  private isImageType = () => {
    const mimeType =
      this.item.mediaType ?? detectMimeTypeFromName(this.item.href)

    return !!mimeType?.startsWith(`image/`)
  }

  private getFrameElement() {
    const frame = this.documentContainer

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
