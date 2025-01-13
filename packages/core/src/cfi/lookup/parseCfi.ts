/* eslint-disable no-useless-escape */
export const parseCfi = (
  cfi: string,
): {
  cleanedCfi: string
  itemIndex?: number
  offset?: number
} => {
  const [itemIndex] =
    cfi
      .match(/\|(\[prose\~anchor[^\]]*\])+/gi)
      ?.map((s) => s.replace(/\|\[prose\~anchor\~/, ``).replace(/\]/, ``)) || []
  const [offset] =
    cfi
      .match(/\|(\[prose\~offset[^\]]*\])+/gi)
      ?.map((s) => s.replace(/\|\[prose\~offset\~/, ``).replace(/\]/, ``)) || []
  const cleanedCfi = cfi.replace(/\|(\[prose\~[^\]]*\~[^\]]*\])+/gi, ``)
  const foundOffset = Number.parseInt(offset || ``)
  const foundItemIndex = Number.parseInt(itemIndex || ``)

  return {
    cleanedCfi,
    itemIndex: Number.isNaN(foundItemIndex) ? undefined : foundItemIndex,
    offset: Number.isNaN(foundOffset) ? undefined : foundOffset,
  }
}
