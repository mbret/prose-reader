export type SpineItemWithSpreadInfo = {
  item: {
    pageSpreadLeft?: true | undefined
    pageSpreadRight?: true | undefined
  }
}

const getSpreadSide = (item: SpineItemWithSpreadInfo | undefined) => {
  if (item?.item.pageSpreadLeft) return `left`
  if (item?.item.pageSpreadRight) return `right`

  return undefined
}

const areOppositeSpreadSides = (
  item: SpineItemWithSpreadInfo | undefined,
  candidate: SpineItemWithSpreadInfo | undefined,
) => {
  const side = getSpreadSide(item)
  const candidateSide = getSpreadSide(candidate)

  return (
    side !== undefined && candidateSide !== undefined && side !== candidateSide
  )
}

export const hasAdjacentSpreadPage = ({
  item,
  nextItem,
  previousItem,
}: {
  item: SpineItemWithSpreadInfo | undefined
  nextItem: SpineItemWithSpreadInfo | undefined
  previousItem: SpineItemWithSpreadInfo | undefined
}) => {
  return (
    areOppositeSpreadSides(item, previousItem) ||
    areOppositeSpreadSides(item, nextItem)
  )
}
