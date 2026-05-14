import { tokenizeXmlSpaceSeparatedList } from "../utils/tokenizeXmlSpaceSeparatedList"

export type OpfItemrefLayoutHints = {
  readonly renditionLayout?: `reflowable` | `pre-paginated`
  readonly renditionFlow?:
    | `scrolled-continuous`
    | `scrolled-doc`
    | `paginated`
    | `auto`
  readonly pageSpreadLeft?: true
  readonly pageSpreadRight?: true
}

/**
 * EPUB `itemref` `properties` attribute (space-separated tokens).
 *
 * @see https://www.w3.org/TR/epub/#attrdef-properties
 */
export const layoutHintsFromItemrefProperties = (
  properties: string | undefined,
): OpfItemrefLayoutHints => {
  const tokens = tokenizeXmlSpaceSeparatedList(properties)
  if (tokens.length === 0) {
    return {}
  }

  let renditionLayout: `reflowable` | `pre-paginated` | undefined
  if (tokens.includes(`rendition:layout-reflowable`)) {
    renditionLayout = `reflowable`
  }
  if (tokens.includes(`rendition:layout-pre-paginated`)) {
    renditionLayout = `pre-paginated`
  }

  let renditionFlow: OpfItemrefLayoutHints["renditionFlow"]
  if (tokens.includes(`rendition:flow-auto`)) {
    renditionFlow = `auto`
  }
  if (tokens.includes(`rendition:flow-paginated`)) {
    renditionFlow = `paginated`
  }
  if (tokens.includes(`rendition:flow-scrolled-doc`)) {
    renditionFlow = `scrolled-doc`
  }
  if (tokens.includes(`rendition:flow-scrolled-continuous`)) {
    renditionFlow = `scrolled-continuous`
  }

  return {
    ...(renditionLayout !== undefined ? { renditionLayout } : {}),
    ...(renditionFlow !== undefined ? { renditionFlow } : {}),
    ...(tokens.includes(`page-spread-left`)
      ? { pageSpreadLeft: true as const }
      : {}),
    ...(tokens.includes(`page-spread-right`)
      ? { pageSpreadRight: true as const }
      : {}),
  }
}
