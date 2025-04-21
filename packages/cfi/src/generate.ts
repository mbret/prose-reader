/**
 * EPUB Canonical Fragment Identifier (CFI) utilities
 */

import { findCommonAncestor } from "./utils"

/**
 * Escape special characters in a CFI string
 */
function cfiEscape(str: string): string {
  return str.replace(/[\[\]\^,();]/g, `^$&`)
}

/**
 * Options for generating CFIs
 */
interface GenerateOptions {
  /**
   * Whether to include text assertions for more robust CFIs
   */
  includeTextAssertions?: boolean

  /**
   * The maximum length of text to use for text assertions
   * Default is 10 characters
   */
  textAssertionLength?: number

  /**
   * Whether to include a side bias assertion
   */
  includeSideBias?: "before" | "after"
}

/**
 * Extract a suitable text assertion from a text node
 */
function extractTextAssertion(
  textNode: Node,
  offset?: number,
  options: GenerateOptions = {},
): string | null {
  if (!textNode.textContent || textNode.textContent.trim() === "") {
    return null
  }

  const textContent = textNode.textContent
  const maxLength = options.textAssertionLength || 10

  // If we have an offset, use the text around that position
  if (offset !== undefined && offset <= textContent.length) {
    // We'll take a portion before and after the offset
    const halfLength = Math.floor(maxLength / 2)
    const start = Math.max(0, offset - halfLength)
    const end = Math.min(textContent.length, offset + halfLength)
    return textContent.substring(start, end)
  }

  // Otherwise, just take the first part of the text
  return textContent.substring(0, Math.min(textContent.length, maxLength))
}

/**
 * Generate a CFI for a node in the DOM
 */
export function generate(
  node: Node,
  offset?: number,
  extra?: string,
  options: GenerateOptions = {},
): string {
  let cfi = ""
  let currentNode: Node | null = node

  // If this is a text node, we need to capture it specially for text assertions
  let textAssertion: string | null = null
  if (node.nodeType === Node.TEXT_NODE && options.includeTextAssertions) {
    textAssertion = extractTextAssertion(node, offset, options)
  }

  // Build the CFI path from the node up to the html element
  while (currentNode?.parentNode) {
    const parentNode: Node = currentNode.parentNode
    const siblings = parentNode.childNodes

    let index = 0
    let found = false

    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === currentNode) {
        index = i
        found = true
        break
      }
    }

    if (!found) {
      throw new Error("Node not found in parent's children")
    }

    // Add the node index to the CFI
    const step = index + 1

    // If the node has an ID, add it to the CFI
    if (currentNode instanceof Element && currentNode.id) {
      cfi = `/${step}[${cfiEscape(currentNode.id)}]${cfi}`
    } else {
      cfi = `/${step}${cfi}`
    }

    // If we've reached the html element, stop traversing up
    if (parentNode.nodeName.toLowerCase() === "html") {
      break
    }

    currentNode = parentNode
  }

  // Add the character offset if provided
  if (offset !== undefined) {
    cfi += `:${offset}`
  }

  // Add text assertions if available
  if (textAssertion) {
    cfi += `[${cfiEscape(textAssertion)}]`
  }

  // Add side bias if specified
  if (options.includeSideBias) {
    const sideBias = options.includeSideBias === "before" ? "b" : "a"
    if (!textAssertion) {
      // If we don't have a text assertion, add the side bias directly
      cfi += `[;s=${sideBias}]`
    } else {
      // Otherwise, we need to modify the last text assertion
      // Remove the closing bracket and add the side bias
      cfi = `${cfi.substring(0, cfi.length - 1)};s=${sideBias}]`
    }
  }

  // Add any extra information
  if (extra) {
    cfi += extra
  }

  // Wrap the CFI in the epubcfi() function
  return `epubcfi(${cfi})`
}

/**
 * Generate a CFI range between two points in the document
 */
export function generateRangeCfi(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
  options: GenerateOptions = {},
): string {
  // Find common ancestor
  const ancestor = findCommonAncestor(startNode, endNode)
  if (!ancestor) {
    throw new Error("No common ancestor found")
  }

  // Generate CFI from ancestor to document
  const ancestorCfi = generate(ancestor, undefined, undefined, options)

  // Generate path from ancestor to start node
  const startPath = generateRelativePath(
    ancestor,
    startNode,
    startOffset,
    options,
  )

  // Generate path from ancestor to end node
  const endPath = generateRelativePath(ancestor, endNode, endOffset, options)

  // Unwrap the base CFI
  const unwrappedAncestorCfi = ancestorCfi.replace(/^epubcfi\((.*)\)$/, "$1")

  // Combine into a range CFI
  return `epubcfi(${unwrappedAncestorCfi},${startPath},${endPath})`
}

/**
 * Generate a relative path from one node to another
 */
function generateRelativePath(
  fromNode: Node,
  toNode: Node,
  offset?: number,
  options: GenerateOptions = {},
): string {
  if (fromNode === toNode) {
    return offset !== undefined ? `:${offset}` : ""
  }

  const path: string[] = []
  let currentNode: Node | null = toNode

  // Build path from toNode up to fromNode (exclusive)
  while (currentNode && currentNode !== fromNode) {
    const parentNode = currentNode.parentNode as Node | null
    if (!parentNode) break

    const siblings = parentNode.childNodes
    let index = -1

    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === currentNode) {
        index = i
        break
      }
    }

    if (index === -1) {
      throw new Error("Node not found in parent's children")
    }

    // Add the node index to the path
    const step = index + 1

    // If the node has an ID, add it
    if (currentNode instanceof Element && currentNode.id) {
      path.unshift(`/${step}[${cfiEscape(currentNode.id)}]`)
    } else {
      path.unshift(`/${step}`)
    }

    currentNode = parentNode
  }

  let relativePath = path.join("")

  // Add offset if specified
  if (offset !== undefined) {
    relativePath += `:${offset}`
  }

  // Add text assertion if enabled
  if (options.includeTextAssertions && toNode.nodeType === Node.TEXT_NODE) {
    const textAssertion = extractTextAssertion(toNode, offset, options)
    if (textAssertion) {
      relativePath += `[${cfiEscape(textAssertion)}]`
    }
  }

  // Add side bias if specified
  if (options.includeSideBias) {
    const sideBias = options.includeSideBias === "before" ? "b" : "a"
    if (options.includeTextAssertions && toNode.nodeType === Node.TEXT_NODE) {
      // If we have a text assertion, modify it to include side bias
      relativePath = relativePath.replace(/\]$/, `;s=${sideBias}]`)
    } else {
      // Otherwise add a separate side bias
      relativePath += `[;s=${sideBias}]`
    }
  }

  return relativePath
}
