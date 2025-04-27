/**
 * Utility functions for EPUB CFI operations
 */

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
export const CFI_SPECIAL_CHARS = /[\[\]\^,();]/g

/**
 * Escape special characters in a CFI string
 * @param str The string to escape
 * @returns The escaped string
 */
export function cfiEscape(str: string): string {
  return str.replace(CFI_SPECIAL_CHARS, `^$&`)
}

/**
 * Regular expression to check if a string is a valid CFI
 */
export const isCFI = /^epubcfi\((.*)\)$/

/**
 * Wrap a CFI string in the epubcfi() function
 * @param cfi The CFI string to wrap
 * @returns The wrapped CFI string
 */
export function wrapCfi(cfi: string): string {
  return isCFI.test(cfi) ? cfi : `epubcfi(${cfi})`
}

/**
 * @important Make it non browser runtime specific
 */
export const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

/**
 * @important Make it non browser runtime specific
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const isNode = (node: any): node is Node =>
  typeof node === "object" &&
  node !== null &&
  "nodeType" in node &&
  (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)

/**
 * Check if a node is a text node
 */
export const isTextNode = (node: Node): boolean =>
  node.nodeType === Node.TEXT_NODE
