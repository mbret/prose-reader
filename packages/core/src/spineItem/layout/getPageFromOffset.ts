export const getPageFromOffset = (
  offset: number,
  pageWidth: number,
  numberOfPages: number,
) => {
  const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

  if (offset <= 0 || numberOfPages === 0) return 0

  if (offset >= numberOfPages * pageWidth) return numberOfPages - 1

  return (
    offsetValues.findIndex((offsetRange) => offset < offsetRange + pageWidth) ??
    0
  )
}
