import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { DocumentRenderer } from "../renderer/DocumentRenderer"

/**
 * Whether a document is laid out as one column, as tall as its content, rather
 * than paginated: a reflowable document the reader scrolls through. That is
 * whatever makes it scroll, a book declaring `rendition:flow`
 * `scrolled-continuous` or an app setting `pageTurnMode` to `scrollable`.
 *
 * A document written vertically stays paginated, its pages running downward:
 * one column of it would scroll horizontally.
 *
 * @see https://www.w3.org/TR/epub-rs-33/#flow
 */
export const isLaidOutAsOneColumn = ({
  computedPageTurnMode,
  renditionLayout,
  isUsingVerticalWriting,
}: {
  computedPageTurnMode: ReaderSettingsManager["values"]["computedPageTurnMode"]
  renditionLayout: DocumentRenderer["renditionLayout"]
  isUsingVerticalWriting: boolean
}) =>
  computedPageTurnMode === "scrollable" &&
  renditionLayout === "reflowable" &&
  !isUsingVerticalWriting
