import { tokenizeXmlSpaceSeparatedList } from "../utils/tokenizeXmlSpaceSeparatedList"

export type OpfItemrefLayoutHints = {
  readonly renditionLayout?: `reflowable` | `pre-paginated`
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

  return {
    ...(renditionLayout !== undefined ? { renditionLayout } : {}),
    ...(tokens.includes(`page-spread-left`)
      ? { pageSpreadLeft: true as const }
      : {}),
    ...(tokens.includes(`page-spread-right`)
      ? { pageSpreadRight: true as const }
      : {}),
  }
}
