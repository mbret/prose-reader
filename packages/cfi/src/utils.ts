import type { CfiRange, ParsedCfi } from "./parse"

/**
 * Get all ancestors of a node, including the node itself
 */
export function getAncestors(node: Node): Node[] {
  const ancestors: Node[] = [node]
  let current: Node | null = node

  while (current.parentNode) {
    ancestors.push(current.parentNode)
    current = current.parentNode
  }

  return ancestors
}

/**
 * Find the closest common ancestor of two nodes
 */
export function findCommonAncestor(nodeA: Node, nodeB: Node): Node | null {
  if (nodeA === nodeB) return nodeA

  const ancestorsA = getAncestors(nodeA)
  const ancestorsSet = new Set(ancestorsA)

  // Start with nodeB and traverse up until we find a common ancestor
  let current: Node | null = nodeB
  while (current) {
    if (ancestorsSet.has(current)) {
      return current
    }
    current = current.parentNode
  }

  return null
}

/**
 * Special characters in CFI that need to be escaped according to the spec
 * These are: [ ] ^ , ( ) ;
 */
export const CFI_SPECIAL_CHARS = /[[\]^,();]/g

/**
 * Escape special characters in a CFI string
 * @param str The string to escape
 * @returns The escaped string
 */
export function cfiEscape(str: string): string {
  return str.replace(CFI_SPECIAL_CHARS, `^$&`)
}

/**
 * Regular expression to check if a string is a valid CFI. Its values can hold
 * line breaks, such as a text assertion spanning lines, so it matches across
 * them.
 */
export const isCFI = /^epubcfi\(([\s\S]*)\)$/

/**
 * @important Make it non browser runtime specific
 */
export const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

/**
 * @important Make it non browser runtime specific
 */
// biome-ignore lint/suspicious/noExplicitAny: TODO
export const isNode = (node: any): node is Node =>
  typeof node === "object" &&
  node !== null &&
  "nodeType" in node &&
  (node.nodeType === Node.ELEMENT_NODE ||
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE)

/**
 * Text and CDATA nodes: the character data a CFI step can address
 * (EPUB CFI 3.1.1). Comments and processing instructions are ignored.
 */
export const isCharacterData = (node: Node): node is CharacterData =>
  node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE

/**
 * The even step of an element: twice its 1-based position among its parent's
 * element children.
 */
export const getElementStep = (node: Node): number => {
  const parent = node.parentNode
  let elements = 0

  for (let i = 0; parent && i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]

    if (!child) break
    if (isElement(child)) elements++
    if (child === node) break
  }

  return elements * 2
}

/**
 * The step of the character data chunk a node belongs to, and the number of
 * characters that chunk holds before the node.
 *
 * Character data between two element children forms one chunk with an odd
 * index (1 before the first element, 3 after it, and so on), whatever the
 * number of DOM nodes it spans: adjacent text nodes, CDATA sections and the
 * comments between them all belong to the same chunk, and a character offset
 * counts from its start.
 */
export const getCharacterDataStep = (
  node: Node,
): { step: number; base: number } => {
  const parent = node.parentNode
  let elementsBefore = 0
  let base = 0

  for (let i = 0; parent && i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]

    if (!child || child === node) break

    if (isElement(child)) {
      elementsBefore++
      base = 0
    } else if (isCharacterData(child)) {
      base += child.data.length
    }
  }

  return { step: elementsBefore * 2 + 1, base }
}

/**
 * What an odd step addresses under `parent`: the first node of its chunk of
 * character data, or, when that chunk is empty, the boundary it stands for in
 * the parent (the child index right after the preceding element, 0 before
 * the first one). `undefined` when the parent has fewer element children
 * than the step needs.
 */
export type CharacterDataChunk =
  | { kind: "node"; node: CharacterData }
  | { kind: "boundary"; parent: Node; childIndex: number }

export const findCharacterDataChunk = (
  parent: Node,
  step: number,
): CharacterDataChunk | undefined => {
  const chunk = (step - 1) / 2
  let elementsBefore = 0
  let childIndex = 0

  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]

    if (!child) break

    if (isElement(child)) {
      elementsBefore++
      if (elementsBefore > chunk) break
      childIndex = i + 1
    } else if (elementsBefore === chunk && isCharacterData(child)) {
      return { kind: "node", node: child }
    }
  }

  return elementsBefore < chunk
    ? undefined
    : { kind: "boundary", parent, childIndex }
}

/**
 * The node and local offset a chunk offset lands on, counting from `first`,
 * the chunk's first node. A boundary between two nodes lands at the start of
 * the later one; an offset past the chunk keeps its excess on the last node.
 */
export const locateInCharacterDataChunk = (
  first: CharacterData,
  offset: number,
): { node: CharacterData; offset: number } => {
  let node = first
  let base = 0
  let sibling: Node | null = first

  while (sibling && !isElement(sibling)) {
    if (isCharacterData(sibling)) {
      node = sibling

      if (offset < base + sibling.data.length) {
        return { node, offset: offset - base }
      }

      base += sibling.data.length
    }

    sibling = sibling.nextSibling
  }

  return { node, offset: offset - (base - node.data.length) }
}

/**
 * Checks if a parsed CFI only contains indirection with no further path
 * For example: epubcfi(/6/2[cover]!)
 */
export function isIndirectionOnly(parsed: ParsedCfi): boolean {
  // If it's a range, it can't be just indirection
  if (isParsedCfiRange(parsed)) {
    return false
  }

  // For an indirection-only CFI:
  // 1. It must have at least one part
  // 2. It must end with an indirection marker (!)
  // 3. There must be no content after the indirection marker

  // Check if there's indirection (marked by presence of multiple parts)
  // AND the last part is empty (nothing after the indirection marker)
  const lastPart = parsed[parsed.length - 1]

  return parsed.length > 1 && (lastPart === undefined || lastPart.length === 0)
}

/**
 * Check if a parsed CFI is a range
 */
export function isParsedCfiRange(parsed: ParsedCfi): parsed is CfiRange {
  return (
    parsed !== null &&
    typeof parsed === "object" &&
    "parent" in parsed &&
    "start" in parsed &&
    "end" in parsed
  )
}
