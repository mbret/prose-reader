/**
 * The search text is matched literally, so every character a RegExp would read
 * as syntax is escaped. Built-in `RegExp.escape` is too recent to rely on.
 */
const escapeRegExpSyntax = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)

/**
 * Walk the subtree accumulating a range for every match of `regexp`.
 *
 * A full-book search runs this over the rendered document of *every* spine
 * item, so the text-node loop below is the hot path (thousands of text nodes
 * per large chapter). Two things are hoisted out of it to keep the work
 * proportional to the number of matches rather than the number of nodes:
 * - the search regexp is compiled once by the caller and reused across every
 *   node (only its `lastIndex` is reset), instead of recompiling per text node,
 * - matches are pushed into a single shared array instead of allocating a new
 *   array at each node and spreading child results upward.
 *
 * `regexp` must be global and unable to match an empty string: `exec` does not
 * advance past an empty match, so the loop would never end.
 */
const collectMatchingRanges = (
  node: Node,
  regexp: RegExp,
  rangeList: Range[],
) => {
  // `head` in an XHTML document, `HEAD` in an HTML one.
  if (node.nodeName.toLowerCase() === `head`) return

  for (const subNode of node.childNodes) {
    if (subNode.hasChildNodes()) {
      collectMatchingRanges(subNode, regexp, rangeList)
    }

    if (subNode.nodeType === Node.TEXT_NODE && subNode.ownerDocument) {
      // Matched as is, not lowercased: the `i` flag handles case, and
      // lowercasing can change the length of the string (`İ` becomes two code
      // units), which would shift every offset after it.
      const content = subNode.textContent ?? ``

      regexp.lastIndex = 0

      for (
        let match = regexp.exec(content);
        match;
        match = regexp.exec(content)
      ) {
        const range = subNode.ownerDocument.createRange()
        range.setStart(subNode, match.index)
        range.setEnd(subNode, match.index + match[0].length)

        rangeList.push(range)
      }
    }
  }
}

/**
 * Ranges of every case-insensitive, literal occurrence of `text` in `node`.
 * An occurrence has to be within a single text node.
 */
export const searchTextRangesInNode = (node: Node, text: string) => {
  const rangeList: Range[] = []

  // An empty text occurs everywhere and nowhere useful.
  if (text === ``) return rangeList

  collectMatchingRanges(
    node,
    new RegExp(escapeRegExpSyntax(text), `gi`),
    rangeList,
  )

  return rangeList
}
