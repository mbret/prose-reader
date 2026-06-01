import { getItemSpreadPosition, type Manifest } from "@prose-reader/shared"

export type SpineItemWithSpreadInfo = {
  item: Pick<
    Manifest[`spineItems`][number],
    "pageSpreadLeft" | "pageSpreadRight"
  >
}

const getSpreadSide = (item: SpineItemWithSpreadInfo | undefined) =>
  item ? getItemSpreadPosition(item.item) : undefined

export const hasAdjacentSpreadPage = ({
  item,
  nextItem,
  previousItem,
  readingDirection,
}: {
  item: SpineItemWithSpreadInfo | undefined
  nextItem: SpineItemWithSpreadInfo | undefined
  previousItem: SpineItemWithSpreadInfo | undefined
  readingDirection: `ltr` | `rtl` | undefined
}) => {
  const side = getSpreadSide(item)

  if (side === undefined) return false

  /**
   * Within a spread the page read first sits in the left slot for `ltr` and the
   * right slot for `rtl`; its facing page is therefore the next spine item. The
   * page read second faces the previous spine item. Pairing only against the
   * correct neighbor avoids treating a lone boundary page as part of a spread.
   */
  const readFirstSide = readingDirection === `rtl` ? `right` : `left`
  const facingItem = side === readFirstSide ? nextItem : previousItem
  const facingSide = getSpreadSide(facingItem)

  return facingSide !== undefined && facingSide !== side
}
