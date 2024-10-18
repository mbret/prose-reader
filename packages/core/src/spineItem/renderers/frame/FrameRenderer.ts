import { Manifest } from "@prose-reader/shared"
import { Context } from "../../../context/Context"
import { FrameItem } from "./FrameItem"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import { injectCSS, removeCSS } from "../../../utils/frames"
import { getStyleForViewportDocument } from "../../styles/getStyleForViewportDocument"

export class FrameRenderer {
  public frameItem: FrameItem

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

  getViewPortInformation = () => {
    const { width: pageWidth, height: pageHeight } = this.context.getPageSize()
    const viewportDimensions = this.frameItem.getViewportDimensions()
    const frameElement = this.frameItem.element

    if (
      this.containerElement &&
      frameElement?.contentDocument &&
      frameElement.contentWindow &&
      viewportDimensions
    ) {
      const computedWidthScale = pageWidth / viewportDimensions.width
      const computedScale = Math.min(
        computedWidthScale,
        pageHeight / viewportDimensions.height,
      )

      return { computedScale, computedWidthScale, viewportDimensions }
    }
  }

  getDimensionsForPaginatedContent = () => {
    const pageSize = this.context.getPageSize()
    const pageWidth = pageSize.width
    const columnHeight = pageSize.height
    const columnWidth = pageWidth

    return { columnHeight, columnWidth }
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
    const { viewportDimensions, computedScale = 1 } =
      this.getViewPortInformation() ?? {}
    const visibleArea = this.context.state.visibleAreaRect
    const frameElement = this.frameItem.element
    const minimumWidth = minPageSpread * this.context.getPageSize().width

    console.log({
      minPageSpread,
      blankPagePosition,
      spreadPosition,
      minimumWidth,
      frameElement,
    })

    if (
      this.frameItem?.isLoaded &&
      frameElement?.contentDocument &&
      frameElement?.contentWindow
    ) {
      const contentWidth = pageWidth
      const contentHeight =
        visibleArea.height + this.context.state.calculatedInnerMargin

      const cssLink = buildDocumentStyle(
        {
          ...this.getDimensionsForPaginatedContent(),
          enableTouch:
            this.settings.values.computedPageTurnMode !== `scrollable`,
          spreadPosition,
        },
        viewportDimensions,
      )

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        this.upsertCSS(`prose-reader-css`, cssLink)
        this.frameItem.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height,
        })

        frameElement?.style.setProperty(`position`, `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)

        if (spreadPosition === `left`) {
          frameElement?.style.setProperty(`right`, `0`)
          frameElement?.style.removeProperty(`left`)
        } else if (blankPagePosition === `before` && this.context.isRTL()) {
          frameElement?.style.setProperty(`right`, `50%`)
          frameElement?.style.removeProperty(`left`)
        } else if (spreadPosition === `right`) {
          frameElement?.style.setProperty(`left`, `0`)
          frameElement?.style.removeProperty(`right`)
        } else {
          frameElement?.style.setProperty(
            `left`,
            blankPagePosition === `before`
              ? this.context.isRTL()
                ? `25%`
                : `75%`
              : blankPagePosition === `after`
                ? this.context.isRTL()
                  ? `75%`
                  : `25%`
                : `50%`,
          )
          frameElement?.style.removeProperty(`right`)
        }
        const transformTranslateX = spreadPosition !== `none` ? `0` : `-50%`
        const transformOriginX =
          spreadPosition === `right` && blankPagePosition !== `before`
            ? `left`
            : spreadPosition === `left` ||
                (blankPagePosition === `before` && this.context.isRTL())
              ? `right`
              : `center`
        frameElement?.style.setProperty(
          `transform`,
          `translate(${transformTranslateX}, -50%) scale(${computedScale})`,
        )
        frameElement?.style.setProperty(
          `transform-origin`,
          `${transformOriginX} center`,
        )
      } else {
        this.upsertCSS(`prose-reader-css`, cssLink)
        this.frameItem.staticLayout({
          width: contentWidth,
          height: contentHeight,
        })
        if (blankPagePosition === `before`) {
          if (this.context.isRTL()) {
            frameElement?.style.setProperty(`margin-right`, `${pageWidth}px`)
          } else {
            frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
          }
        } else {
          frameElement?.style.removeProperty(`margin-left`)
          frameElement?.style.removeProperty(`margin-right`)
        }
      }

      return { width: minimumWidth, height: contentHeight }
    }

    return { width: minimumWidth, height: pageHeight }
  }

  getWritingMode() {
    return this.frameItem.getWritingMode()
  }

  getComputedStyleAfterLoad() {
    return this.frameItem.getComputedStyleAfterLoad()
  }

  /**
   * Helper that will inject CSS into the document frame.
   *
   * @important
   * The document needs to be detected as a frame.
   */
  upsertCSS(id: string, style: string, prepend?: boolean) {
    if (this.frameItem.element) {
      removeCSS(this.frameItem.element, id)
      injectCSS(this.frameItem.element, id, style, prepend)
    }
  }

  get element() {
    return this.frameItem.element
  }

  destroy() {
    this.frameItem.destroy()
  }
}

const buildDocumentStyle = (
  {
    columnWidth,
    enableTouch,
    spreadPosition,
  }: {
    columnWidth: number
    columnHeight: number
    enableTouch: boolean
    spreadPosition: `none` | `left` | `right`
  },
  viewportDimensions: { height: number; width: number } | undefined,
) => {
  return `
      ${getStyleForViewportDocument()}
      body {
        ${
          !viewportDimensions
            ? `
          display: flex;
          justify-content: ${spreadPosition === `left` ? `flex-end` : spreadPosition === `right` ? `flex-start` : `center`};
        `
            : ``
        }
      }
      ${
        /*
        might be html * but it does mess up things like figure if so.
        check accessible_epub_3
      */ ``
      }
      html, body {
        height: 100%;
        width: 100%;
      }
      ${
        /*
        This one is important for preventing 100% img to resize above
        current width. Especially needed for cbz conversion
      */ ``
      }
      html, body {
        -max-width: ${columnWidth}px !important;
      }
      ${
        /*
         * @see https://hammerjs.github.io/touch-action/
         * It needs to be disabled when using free scroll
         */
        ``
      }
      html, body {
        ${
          enableTouch
            ? `
          touch-action: none
        `
            : ``
        }
      }
      ${
        /*
        prevent drag of image instead of touch on firefox
      */ ``
      }
      img {
        user-select: none;
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
        ${
          /*
          prevent weird overflow or margin. Try `block` if `flex` has weird behavior
        */ ``
        }
        display: flex;
        ${
          /*
          If the document does not have viewport, we cannot scale anything inside.
          This should never happens with a valid epub document however it will happens if
          we load .jpg, .png, etc directly in the iframe. This is expected, in this case we force
          the inner content to display correctly.
        */ ``
        }
        ${
          !viewportDimensions
            ? `
          -width: 100%;
          max-width: 100%;
          height:100%;
          object-fit:contain;
        `
            : ``
        }
      }
    `
}
