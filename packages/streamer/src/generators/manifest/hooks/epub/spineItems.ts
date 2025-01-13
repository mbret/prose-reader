import type { Manifest } from "@prose-reader/shared"
import type xmldoc from "xmldoc"

export type SpineItemProperties =
  // @see https://www.w3.org/TR/epub/#layout-overrides
  | `rendition:layout-reflowable`
  // @se https://www.w3.org/TR/epub/#layout-overrides
  | `rendition:layout-pre-paginated`
  | `page-spread-left`
  | `page-spread-right`

export const getSpineItemInfo = (
  itemRefElement: xmldoc.XmlElement,
): Partial<Manifest["spineItems"][number]> => {
  /**
   * @see https://www.w3.org/TR/epub/#attrdef-properties
   */
  const properties = (itemRefElement.attr.properties?.split(` `) ||
    []) as SpineItemProperties[]

  let renditionLayout: Manifest["spineItems"][number]["renditionLayout"] =
    undefined

  if (
    properties.find((property) => property === `rendition:layout-reflowable`)
  ) {
    renditionLayout = `reflowable`
  }

  if (
    properties.find((property) => property === `rendition:layout-pre-paginated`)
  ) {
    renditionLayout = `pre-paginated`
  }

  return {
    renditionLayout,
    pageSpreadLeft:
      properties.some((property) => property === `page-spread-left`) ||
      undefined,
    pageSpreadRight:
      properties.some((property) => property === `page-spread-right`) ||
      undefined,
  }
}
