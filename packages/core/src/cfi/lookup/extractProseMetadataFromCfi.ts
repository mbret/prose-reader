/* eslint-disable no-useless-escape */
export const extractProseMetadataFromCfi = (
  cfi: string,
): {
  cleanedCfi: string
  itemId?: string
  offset?: number
} => {
  const [itemId] =
    cfi
      .match(/\|(\[prose\~anchor[^\]]*\])+/gi)
      ?.map((s) => s.replace(/\|\[prose\~anchor\~/, ``).replace(/\]/, ``)) || []
  const [offset] =
    cfi
      .match(/\|(\[prose\~offset[^\]]*\])+/gi)
      ?.map((s) => s.replace(/\|\[prose\~offset\~/, ``).replace(/\]/, ``)) || []
  const cleanedCfi = cfi.replace(/\|(\[prose\~[^\]]*\~[^\]]*\])+/gi, ``)
  const foundOffset = parseInt(offset || ``)

  return {
    cleanedCfi,
    itemId: itemId ? decodeURIComponent(itemId) : itemId,
    offset: isNaN(foundOffset) ? undefined : foundOffset,
  }
}
