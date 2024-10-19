import { detectMimeTypeFromName, Manifest } from "@prose-reader/shared"
import { Context } from "../../../context/Context"
import { FrameItem } from "./FrameItem"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import { getViewPortInformation, renderPrePaginated } from "./prePaginated/renderPrePaginated"
import { renderReflowable } from "./reflowable/renderReflowable"

export class HtmlRenderer {
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
    private context: Context,
    public settings: ReaderSettingsManager,
    public hookManager: HookManager,
    public item: Manifest[`spineItems`][number],
    private containerElement: HTMLElement,
  ) {
    this.frameItem = new FrameItem(
      this.containerElement,
      item,
      context,
      settings,
      hookManager,
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
      enableTouch: this.settings.values.computedPageTurnMode !== `scrollable`
    })

    this.latestContentHeightWhenLoaded = latestContentHeightWhenLoaded

    return rest
  }

  /**
   * Detect the type of resource (independently of rendition flow).
   * If an image is detected for reflowable for example we may want to display
   * things accordingly.
   */
  protected isImageType = () => {
    const mimeType =
      this.item.mediaType ?? detectMimeTypeFromName(this.item.href)

    return !!mimeType?.startsWith(`image/`)
  }

  getWritingMode() {
    return this.frameItem.getWritingMode()
  }

  getViewPortInformation() {
    return getViewPortInformation({
      frameItem: this.frameItem,
      pageHeight: this.context.getPageSize().height,
      pageWidth: this.context.getPageSize().width
    })
  }

  getComputedStyleAfterLoad() {
    return this.frameItem.getComputedStyleAfterLoad()
  }

  get element() {
    return this.frameItem.element
  }

  destroy() {
    this.frameItem.destroy()
  }
}
