import { getItemSpreadPosition, type Manifest } from "@prose-reader/shared"

type SpineItem = Manifest["spineItems"][number]
type PageSpreadSide = "left" | "right"

const spreadPropertiesForSide = (
  side: PageSpreadSide,
): Pick<SpineItem, "pageSpreadLeft" | "pageSpreadRight"> =>
  side === `left`
    ? { pageSpreadLeft: true, pageSpreadRight: undefined }
    : { pageSpreadLeft: undefined, pageSpreadRight: true }

const naturalSpreadSideAtIndex = ({
  index,
  readingDirection,
}: {
  index: number
  readingDirection: Manifest["readingDirection"]
}): PageSpreadSide => {
  const isEvenSlot = index % 2 === 0

  return readingDirection === `rtl`
    ? isEvenSlot
      ? `right`
      : `left`
    : isEvenSlot
      ? `left`
      : `right`
}

const openingPageSideForParityShift = (
  readingDirection: Manifest["readingDirection"],
): PageSpreadSide => (readingDirection === `rtl` ? `left` : `right`)

const isSpreadPair = ({
  firstItem,
  secondItem,
}: {
  firstItem: SpineItem | undefined
  secondItem: SpineItem | undefined
}) => {
  if (firstItem === undefined || secondItem === undefined) return false

  const firstSide = getItemSpreadPosition(firstItem)
  const secondSide = getItemSpreadPosition(secondItem)

  return (
    firstSide !== undefined &&
    secondSide !== undefined &&
    firstSide !== secondSide
  )
}

const isSpreadPairNaturallyAligned = ({
  firstItem,
  firstItemIndex,
  readingDirection,
  secondItem,
}: {
  firstItem: SpineItem
  firstItemIndex: number
  readingDirection: Manifest["readingDirection"]
  secondItem: SpineItem
}) =>
  getItemSpreadPosition(firstItem) ===
    naturalSpreadSideAtIndex({
      index: firstItemIndex,
      readingDirection,
    }) &&
  getItemSpreadPosition(secondItem) ===
    naturalSpreadSideAtIndex({
      index: firstItemIndex + 1,
      readingDirection,
    })

export const alignSpineItemsForSpreadParity = ({
  readingDirection,
  spineItems,
}: {
  readingDirection: Manifest["readingDirection"]
  spineItems: SpineItem[]
}) => {
  const openingItem = spineItems[0]

  if (
    openingItem === undefined ||
    getItemSpreadPosition(openingItem) !== undefined
  ) {
    return spineItems
  }

  const misalignedPairIndex = spineItems.findIndex((firstItem, index) => {
    const secondItem = spineItems[index + 1]

    if (
      !isSpreadPair({
        firstItem,
        secondItem,
      })
    ) {
      return false
    }

    if (secondItem === undefined) return false

    return !isSpreadPairNaturallyAligned({
      firstItem,
      firstItemIndex: index,
      readingDirection,
      secondItem,
    })
  })

  if (misalignedPairIndex <= 0) return spineItems

  return [
    {
      ...openingItem,
      ...spreadPropertiesForSide(
        openingPageSideForParityShift(readingDirection),
      ),
    },
    ...spineItems.slice(1),
  ]
}
