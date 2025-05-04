import { isParsedCfiRange, parse, resolveExtensions } from "@prose-reader/cfi"

export const parseCfi = (
  cfi: string,
): {
  cleanedCfi: string
  itemIndex?: number
  offset?: number
} => {
  // const [itemIndex] =
  //   cfi
  //     .match(/\|(\[prose\~anchor[^\]]*\])+/gi)
  //     ?.map((s) => s.replace(/\|\[prose\~anchor\~/, ``).replace(/\]/, ``)) || []
  // const [offset] =
  //   cfi
  //     .match(/\|(\[prose\~offset[^\]]*\])+/gi)
  //     ?.map((s) => s.replace(/\|\[prose\~offset\~/, ``).replace(/\]/, ``)) || []
  // const cleanedCfi = cfi.replace(/\|(\[prose\~[^\]]*\~[^\]]*\])+/gi, ``)
  // const foundOffset = Number.parseInt(offset || ``)
  // const foundItemIndex = Number.parseInt(itemIndex || ``)

  const parsedCfi = parse(cfi)
  const extensions = resolveExtensions(parsedCfi)
  const proseAnchor = Number.parseInt(extensions?.["vnd.prose.anchor"] || ``)
  const offset = isParsedCfiRange(parsedCfi)
    ? parsedCfi.end.at(-1)?.at(-1)?.offset
    : parsedCfi.at(-1)?.at(-1)?.offset

  console.log("FOOO", cfi, parsedCfi, extensions, proseAnchor, offset)

  return {
    cleanedCfi: cfi,
    itemIndex: Number.isNaN(proseAnchor) ? undefined : proseAnchor,
    offset: offset ?? 0,
  }
}
