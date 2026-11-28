import { unwrapCfi } from "./parse.ts"

/**
 * The indexes, in the text of a CFI, of the commas that separate the parent
 * path of a range from its start, and its start from its end. A comma in an
 * assertion (`[...]`) separates nothing, and neither does a character that
 * `^` escapes.
 */
const getIndexesOfRangeSeparators = (cfiText: string) => {
  const indexes: number[] = []
  let isInAssertion = false

  for (let index = 0; index < cfiText.length; index++) {
    const character = cfiText[index]

    if (character === "^") {
      // The next character is escaped: it is text, whatever it is.
      index++
    } else if (character === "[") {
      isInAssertion = true
    } else if (character === "]") {
      isInAssertion = false
    } else if (character === "," && !isInAssertion) {
      indexes.push(index)
    }
  }

  return indexes
}

/**
 * Gives the point a range CFI starts at, or the point it ends at with
 * `to: "end"`, as a CFI. A CFI that is not a range is a point already, and
 * comes back as it is.
 *
 * A range is written `parent,start,end`, where each boundary continues the
 * parent path. The point is the parent path followed by the boundary: this
 * reads the text of the CFI, and no document.
 */
export function collapse(
  cfi: string,
  { to = "start" }: { to?: "start" | "end" } = {},
): string {
  const cfiText = unwrapCfi(cfi)
  const [startSeparatorIndex, endSeparatorIndex, ...otherSeparatorIndexes] =
    getIndexesOfRangeSeparators(cfiText)

  if (startSeparatorIndex === undefined) return cfi

  if (endSeparatorIndex === undefined || otherSeparatorIndexes.length > 0) {
    throw new Error(
      `Expected the range CFI "${cfi}" to have one start and one end`,
    )
  }

  const parentPath = cfiText.slice(0, startSeparatorIndex)
  const boundary =
    to === "start"
      ? cfiText.slice(startSeparatorIndex + 1, endSeparatorIndex)
      : cfiText.slice(endSeparatorIndex + 1)
  const point = `${parentPath}${boundary}`

  // A CFI can come without its `epubcfi()`: the point comes back the same way.
  return cfiText === cfi ? point : `epubcfi(${point})`
}
