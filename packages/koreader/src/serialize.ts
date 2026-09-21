import type { ParsedXPointer } from "./types"

/**
 * Prints a pointer in the shape `toStringV2` (crengine/src/lvtinydom.cpp)
 * produces for DOM versions 20200223..20260811, the one every third-party
 * consumer was written against: an index is written only where the parsed
 * structure carries one, and the spine item prefix is always
 * `/body/DocFragment[N]/body`.
 *
 * `serializeXPointer(parseXPointer(s))` is `s` for every pointer crengine
 * writes in that shape for a book with several spine items; the single-item
 * prefix `/body/DocFragment/body` and the explicit `body[1]` prefixes come
 * back normalised. `generateXPointer` decides where an index is needed; this
 * function never looks at a DOM.
 */
export const serializeXPointer = (parsed: ParsedXPointer): string => {
  let output = `/body/DocFragment[${parsed.spineItemIndex + 1}]/body`

  for (const step of parsed.steps) {
    if (step.kind === "nodeIndex") {
      output += `/${step.index}`
    } else {
      const name = step.kind === "text" ? "text()" : step.name

      output +=
        step.index === undefined ? `/${name}` : `/${name}[${step.index}]`
    }
  }

  return parsed.point === undefined ? output : `${output}.${parsed.point}`
}
