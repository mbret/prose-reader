import { detectMimeTypeFromName, Manifest } from "@prose-reader/shared"
import { Context } from "../../../context/Context"
import { FrameItem } from "./FrameItem"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import { renderPrePaginated } from "./prePaginated/renderPrePaginated"
import { renderReflowable } from "./reflowable/renderReflowable"
import { Renderer } from "../Renderer"
import { ResourceHandler } from "../../ResourceHandler"

export class HtmlRenderer extends Renderer {
  public frameItem: FrameItem

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
    resourcesHandler: ResourceHandler
  ) {
    super(context, settings, hookManager, item, containerElement, resourcesHandler)
    this.frameItem = new FrameItem(
      containerElement,
      item,
      context,
      settings,
      hookManager,
      this.stateSubject,
      resourcesHandler
    )
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

    if (this.item.renditionLayout === `pre-paginated`) {
      return renderPrePaginated({
        blankPagePosition,
        enableTouch: this.settings.values.computedPageTurnMode !== `scrollable`,
        frameItem: this.frameItem,
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
      frameItem: this.frameItem,
      manifest: this.context.manifest,
      blankPagePosition,
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

  get element() {
    return this.frameItem.loader.element
  }

  get writingMode() {
    return this.frameItem.getWritingMode()
  }

  get readingDirection() {
    const writingMode = this.writingMode

    if (writingMode === `vertical-rl`) {
      return `rtl`
    }

    const direction = this.frameItem.getComputedStyleAfterLoad()?.direction

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

  load = () => this.frameItem.load()

  unload = () => this.frameItem.unload()

  get layers() {
    if (!this.frameItem.loader.element) return []

    return [
      {
        element: this.frameItem.loader.element,
      },
    ]
  }

  destroy() {
    this.frameItem.destroy()
  }
}
