import { detectMimeTypeFromName, Manifest } from "@prose-reader/shared"
import { Context } from "../../../context/Context"
import { FrameItem } from "./FrameItem"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import {
  getViewPortInformation,
  renderPrePaginated,
} from "./prePaginated/renderPrePaginated"
import { renderReflowable } from "./reflowable/renderReflowable"
import { Renderer } from "../Renderer"
import { upsertCSS } from "../../../utils/frames"
import { Observable } from "rxjs"

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
  ) {
    super(context, settings, hookManager, item, containerElement)
    this.frameItem = new FrameItem(
      containerElement,
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
      enableTouch: this.settings.values.computedPageTurnMode !== `scrollable`,
    })

    this.latestContentHeightWhenLoaded = latestContentHeightWhenLoaded

    return rest
  }

  isImageType = () => {
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
      pageWidth: this.context.getPageSize().width,
    })
  }

  getComputedStyleAfterLoad() {
    return this.frameItem.getComputedStyleAfterLoad()
  }

  get element() {
    return this.frameItem.element
  }

  get isReady() {
    return this.frameItem.isReady
  }

  get loaded$() {
    return this.frameItem.loaded$
  }

  get ready$() {
    return this.frameItem.ready$
  }

  get unloaded$() {
    return this.frameItem.unloaded$
  }

  isUsingVerticalWriting = () =>
    this.frameItem.getWritingMode()?.startsWith(`vertical`)

  get isReady$() {
    return this.frameItem.isReady$
  }

  load = () => this.frameItem.load()

  unload = () => this.frameItem.unload()

  get layers() {
    if (!this.frameItem.element) return []

    return [
      {
        element: this.frameItem.element,
      },
    ]
  }

  /**
   * Helper that will inject CSS into the document frame.
   *
   * @important
   * The document needs to be detected as a frame.
   */
  upsertCSS(id: string, style: string, prepend?: boolean) {
    if (this.frameItem.element) {
      upsertCSS(this.frameItem.element, id, style, prepend)
    }
  }

  destroy() {
    this.frameItem.destroy()
  }
}
