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
  const foundOffset = parseInt(offset || ``)
  const foundItemIndex = parseInt(itemIndex || ``)

  return {
    cleanedCfi,
    itemIndex: isNaN(foundItemIndex) ? undefined : foundItemIndex,
    offset: isNaN(foundOffset) ? undefined : foundOffset,
  }
}
