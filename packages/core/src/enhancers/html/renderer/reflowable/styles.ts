/**
 * Item is:
 * - anything that contains a defined width/height viewport
 *
 * In this case we respect the viewport, scale it and act as pre-paginated.
 *
 * Using a viewport means the page should fit and be displayed as it is. This
 * is one of the reason of using viewport.
 *
 * Ideally we should not touch too much of how things are presented, especially
 * images since this mode would be most often used for it.
 *
 * Changing text display needs to be done carefully as well since it may overflow
 * Again this is because the page is designed to fit perfectly due to viewport
 */
export const buildStyleForViewportFrame = () => {
  return `
      body {
        margin: 0;
      }
      html {
        width: 100%;
        height: 100%;
      }
      body {
        width: 100%;
        height: 100%;
        margin: 0;
      }
      ${
        /*
         * @see https://hammerjs.github.io/touch-action/
         */
        ``
      }
      html, body {
        touch-action: none;
      }
    `
}

/**
 * Item is:
 * - not pre-paginated (we would not be in this item otherwise)
 * - jpg, png, etc
 *
 * It does not means it has to be pre-paginated (scrollable for example)
 */
export const buildStyleForReflowableImageOnly = ({
  isScrollable,
  enableTouch,
}: {
  enableTouch: boolean
  isScrollable: boolean
}) => {
  return `
      ${
        /*
         * @see https://hammerjs.github.io/touch-action/
         */
        ``
      }
      html, body {
        width: 100%;
        margin: 0;
        padding: 0;
        ${
          !enableTouch
            ? `
          touch-action: none
        `
            : ``
        }
      }
      ${
        isScrollable
          ? `
        img {
          height: auto !important;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          ${
            // we make sure img spread on entire screen
            ``
          }
          width: 100%;
          ${
            /**
             * line break issue
             * @see https://stackoverflow.com/questions/37869020/image-not-taking-up-the-full-height-of-container
             */
            ``
          }
          display: block;
        }
      `
          : ``
      }
    `
}

/**
 * Item is:
 * - regular html document
 * - does not contain defined width/height viewport
 *
 * We use css multi column to paginate it
 *
 * @important
 * The style here does not takes margin into account, we assume everything is 0.
 * It is being handled by enhancer.
 */
export const buildStyleWithMultiColumn = ({
  width,
  columnHeight,
  columnWidth,
}: {
  width: number
  columnWidth: number
  columnHeight: number
}) => {
  return `
      parsererror {
        display: none !important;
      }
      ${
        /*
        might be html * but it does mess up things like figure if so.
        check accessible_epub_3
      */ ``
      }
      html, body {
        margin: 0;
        padding: 0 !important;
        -max-width: ${columnWidth}px !important;
      }
      ${
        /*
        body {
          height: ${columnHeight}px !important;
          width: ${columnWidth}px !important;
          -margin-left: ${horizontalMargin}px !important;
          -margin-right: ${horizontalMargin}px !important;
          -margin: ${verticalMargin}px ${horizontalMargin}px !important;
          -padding-top: ${horizontalMargin}px !important;
          -padding-bottom: ${horizontalMargin}px !important;
        }
      */ ``
      }
      body {
        padding: 0 !important;
        width: ${width}px !important;
        height: ${columnHeight}px !important;
        overflow-y: hidden;
        column-gap: 0px !important;
        column-width: ${columnWidth}px !important;
        column-fill: auto !important;
        word-wrap: break-word;
        box-sizing: border-box;
      }
      body {
        margin: 0;
      }
      body:focus-visible {
        ${
          /*
          we make sure that there are no outline when we focus something inside the iframe
        */ ``
        }
        outline: none;
      }
      ${
        /*
         * @see https://hammerjs.github.io/touch-action/
         */
        ``
      }
      html, body {
        touch-action: none;
      }
      ${
        /*
        this messes up hard, be careful with this
      */ ``
      }
      * {
        -max-width: ${columnWidth}px !important;
      }
      ${
        /*
        this is necessary to have a proper calculation when determining size
        of iframe content. If an img is using something like width:100% it would expand to
        the size of the original image and potentially gives back a wrong size (much larger)
        @see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Columns/Handling_Overflow_in_Multicol
      */ ``
      }
      img, video, audio, object, svg {
        max-width: 100%;
        -max-width: ${columnWidth}px !important;
        -max-height: ${columnHeight}px !important;
        -pointer-events: none;
        -webkit-column-break-inside: avoid;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      figure {
        d-max-width: ${columnWidth}px !important;
      }
      img {
        object-fit: contain;
        break-inside: avoid;
        box-sizing: border-box;
        d-max-width: ${columnWidth}px !important;
      }
      ${
        /*
        img, video, audio, object, svg {
          max-height: ${columnHeight}px !important;
          box-sizing: border-box;
          object-fit: contain;
          -webkit-column-break-inside: avoid;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      */ ``
      }
      table {
        max-width: ${columnWidth}px !important;
        table-layout: fixed;
      }
      td {
        max-width: ${columnWidth}px;
      }
    `
}
