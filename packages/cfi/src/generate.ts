/**
 * EPUB Canonical Fragment Identifier (CFI) utilities
 */

import { cfiEscape, findCommonAncestor, isElement, isNode } from "./utils"

/**
 * Options for generating CFIs
 */
export interface GenerateOptions {
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

  /**
   * Whether to include spatial coordinates (for image or video)
   * Values should be in the range 0-100, where (0,0) is top-left and (100,100) is bottom-right
   */
  spatialOffset?: [number, number]

  /**
   * Extension parameters to include in the CFI
   * Keys should be parameter names, values should be the parameter values
   * Vendor-specific parameters should be prefixed with 'vnd.' followed by the vendor name
   */
  extensions?: Record<string, string>
}

/**
 * Position in a document, consisting of a node and optional offset
 */
export interface CfiPosition {
  /**
   * The DOM node
   */
  node?: Node | null

  /**
   * Character offset within the node (for text nodes)
   */
  offset?: number

  /**
   * Temporal position in seconds (for audio/video content)
   */
  temporal?: number

  /**
   * Spatial position as [x,y] coordinates (for image or video)
   * Values should be in the range 0-100, where (0,0) is top-left and (100,100) is bottom-right
   */
  spatial?: [number, number]

  /**
   * Spine index (0-based) for the document containing the node
   */
  spineIndex?: number

  /**
   * ID of the spine item
   */
  spineId?: string
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
 * Helper function to format spatial coordinates
 */
function formatSpatialOffset(spatial: [number, number]): string {
  const [x, y] = spatial
  // Ensure values are within 0-100 range
  const safeX = Math.max(0, Math.min(100, x))
  const safeY = Math.max(0, Math.min(100, y))
  return `@${safeX}:${safeY}`
}

/**
 * Helper function to add temporal and spatial offsets to a CFI string
 */
function addOffsets(
  cfi: string,
  temporal?: number,
  spatial?: [number, number],
): string {
  let result = cfi

  if (temporal !== undefined) {
    result += `~${temporal}`
  }

  if (spatial !== undefined) {
    result += formatSpatialOffset(spatial)
  }

  return result
}

/**
 * Helper function to add text assertion and side bias to a CFI string
 */
function addTextAssertionAndSideBias(
  cfi: string,
  textAssertion: string | null,
  sideBias?: "before" | "after",
): string {
  let result = cfi

  if (textAssertion) {
    result += `[${cfiEscape(textAssertion)}]`
  }

  if (sideBias) {
    const sideBiasChar = sideBias === "before" ? "b" : "a"
    if (!textAssertion) {
      result += `[;s=${sideBiasChar}]`
    } else {
      result = `${result.substring(0, result.length - 1)};s=${sideBiasChar}]`
    }
  }

  return result
}

/**
 * Generate a CFI for a single node in the DOM
 */
function generatePoint(
  node: Node | null,
  offset?: number,
  options: GenerateOptions = {},
  position?: CfiPosition,
): string {
  let cfi = ""
  let currentNode: Node | null = node
  let textNode: Node | null = null

  // Handle text nodes specially
  if (node?.nodeType === Node.TEXT_NODE) {
    // If this is a text node, we need to remember it for text assertions
    // but for path construction, we'll work with the parent
    textNode = node

    // Store the offset value for later
    const parentNode = node.parentNode
    if (!parentNode) {
      throw new Error("Text node doesn't have a parent")
    }

    // Find position of text node among its parent's children
    const siblings = Array.from(parentNode.childNodes)
    const nodeIndex = siblings.indexOf(node as ChildNode)

    if (nodeIndex === -1) {
      throw new Error("Node not found in parent's children")
    }

    // Add the text node reference to the parent element's CFI
    // Text nodes are referenced by their index + 1 (CFI is 1-based)
    cfi = `/${nodeIndex + 1}`

    // If the parent has an ID, include it in the path
    if (isElement(parentNode) && parentNode.id) {
      const parentId = parentNode.id
      // Find the parent's index in its parent's children
      const parentSiblings = Array.from(parentNode.parentNode?.childNodes || [])
      const elementsBefore = parentSiblings
        .slice(0, parentSiblings.indexOf(parentNode as ChildNode) + 1)
        .filter((n) => n.nodeType === Node.ELEMENT_NODE)

      const parentIndex = elementsBefore.length * 2

      cfi = `/${parentIndex}[${cfiEscape(parentId)}]${cfi}`
      currentNode = parentNode.parentNode
    } else {
      // Continue with the parent as our current node
      currentNode = parentNode
    }
  }

  // Set up text assertion if needed
  let textAssertion: string | null = null
  if (textNode && options.includeTextAssertions) {
    textAssertion = extractTextAssertion(textNode, offset, options)
  }

  // Build the CFI path from the current node up to the html element
  while (currentNode?.parentNode) {
    // Skip if we're a text node's parent that's already been handled specially
    if (
      !(
        textNode &&
        currentNode === textNode.parentNode &&
        cfi.includes(`[${isElement(currentNode) ? currentNode.id : ""}]`)
      )
    ) {
      const parentNode = currentNode.parentNode

      // Find index among parent's children
      const siblings = Array.from(parentNode.childNodes)
      const nodeIndex = siblings.indexOf(currentNode as ChildNode)

      if (nodeIndex === -1) {
        throw new Error("Node not found in parent's children")
      }

      // Find position among element siblings for CFI (element nodes only)
      // For CFI, element references are even-numbered (per CFI spec)
      const elementsBefore = siblings
        .slice(0, nodeIndex + 1)
        .filter((n) => n.nodeType === Node.ELEMENT_NODE)

      // Find the position of the current node in element siblings
      let elementIndex: number
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        elementIndex = elementsBefore.length
      } else {
        // For non-element nodes, use the number of elements before it
        elementIndex = elementsBefore.length
      }

      // CFI is 1-based, then doubled for element nodes
      const step = elementIndex * 2

      // Add the node index to the CFI
      // If the node has an ID, add it to the CFI
      if (isElement(currentNode) && currentNode.id) {
        cfi = `/${step}[${cfiEscape(currentNode.id)}]${cfi}`
      } else {
        cfi = `/${step}${cfi}`
      }
    }

    // If we've reached the html element, stop traversing up
    if (currentNode.parentNode.nodeName.toLowerCase() === "html") {
      break
    }

    currentNode = currentNode.parentNode
  }

  // Add the character offset if provided
  if (offset !== undefined) {
    cfi += `:${offset}`
  }

  // Add temporal and spatial offsets using helper
  cfi = addOffsets(
    cfi,
    position?.temporal,
    position?.spatial || options.spatialOffset,
  )

  // Add text assertion and side bias using helper
  cfi = addTextAssertionAndSideBias(cfi, textAssertion, options.includeSideBias)

  cfi = addExtensions(cfi, options.extensions)

  return cfi
}

/**
 * Generate a relative path from one node to another
 */
function generateRelativePath(
  fromNode: Node,
  toNode: Node,
  offset?: number,
  options: GenerateOptions = {},
  position?: CfiPosition,
): string {
  if (fromNode === toNode) {
    let result = offset !== undefined ? `:${offset}` : ""
    result = addOffsets(result, position?.temporal, position?.spatial)
    return result
  }

  const path: string[] = []
  let currentNode: Node | null = toNode

  // Build path from toNode up to fromNode (exclusive)
  while (currentNode && currentNode !== fromNode) {
    const parentNode = currentNode.parentNode as Node | null
    if (!parentNode) break

    const siblings = Array.from(parentNode.childNodes)
    const index = siblings.indexOf(currentNode as ChildNode)

    if (index === -1) {
      throw new Error("Node not found in parent's children")
    }

    let step: number
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      // Find index among element siblings
      const elementSiblings = siblings.filter(
        (n) => n.nodeType === Node.ELEMENT_NODE,
      )
      const elementIndex = elementSiblings.indexOf(currentNode as ChildNode)
      step = (elementIndex + 1) * 2
    } else {
      // For text nodes, use index among all child nodes (1-based, odd)
      step = index + 1
    }

    // If the node has an ID, add it
    if (isElement(currentNode) && currentNode.id) {
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

  // Add temporal and spatial offsets using helper
  relativePath = addOffsets(relativePath, position?.temporal, position?.spatial)

  // Add text assertion and side bias using helper
  if (options.includeTextAssertions && toNode.nodeType === Node.TEXT_NODE) {
    const textAssertion = extractTextAssertion(toNode, offset, options)
    relativePath = addTextAssertionAndSideBias(
      relativePath,
      textAssertion,
      options.includeSideBias,
    )
  }

  // Add extension parameters if specified
  relativePath = addExtensions(relativePath, options.extensions)

  return relativePath
}

const serializeExtensions = (extensions: Record<string, string>) => {
  return Object.entries(extensions)
    .map(([key, value]) => {
      // Properly escape the value according to CFI spec
      const escapedValue = cfiEscape(value)
      // URL encode the value to handle special characters
      return `${key}=${encodeURIComponent(escapedValue)}`
    })
    .join(";")
}

/**
 * Add extension parameters to a CFI path
 */
function addExtensions(
  cfi: string,
  extensions?: Record<string, string>,
): string {
  if (!extensions || Object.keys(extensions).length === 0) {
    return cfi
  }

  const extensionString = serializeExtensions(extensions)

  // If we're dealing with a bracket at end
  if (cfi.endsWith("]")) {
    // Check if there are already parameters
    const lastBracketIndex = cfi.lastIndexOf("[")
    const content = cfi.substring(lastBracketIndex + 1, cfi.length - 1)

    // If content already has these exact extensions, return as is
    if (content.includes(extensionString)) {
      return cfi
    }

    // Add extensions with proper separator
    return `${cfi.substring(0, cfi.length - 1)}${content.includes(";") ? ";" : ";"}${extensionString}]`
  }

  // Special case for spine items with indirection
  if (cfi.endsWith("!")) {
    return cfi
  }

  // No bracket at the end - add with new brackets
  return `${cfi}[;${extensionString}]`
}

/**
 * Generate a range CFI between two points in the document
 */
function generateRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
  options: GenerateOptions = {},
  startPosition?: CfiPosition,
  endPosition?: CfiPosition,
): string {
  // Find common ancestor
  const ancestor = findCommonAncestor(startNode, endNode)

  if (!ancestor) {
    throw new Error("No common ancestor found")
  }

  // Generate CFI from ancestor to document
  const ancestorCfi = generatePoint(ancestor, undefined, options)

  // Generate path from ancestor to start node
  const startPath = generateRelativePath(
    ancestor,
    startNode,
    startOffset,
    options,
    startPosition,
  )

  // Generate path from ancestor to end node
  const endPath = generateRelativePath(
    ancestor,
    endNode,
    endOffset,
    options,
    endPosition,
  )

  // For range CFIs, add extensions to each part separately
  if (options.extensions && Object.keys(options.extensions).length > 0) {
    // Add extensions to each part
    const ancestorWithExt = addExtensions(ancestorCfi, options.extensions)
    const startWithExt = addExtensions(startPath, options.extensions)
    const endWithExt = addExtensions(endPath, options.extensions)

    return `${ancestorWithExt},${startWithExt},${endWithExt}`
  }

  // Combine into a regular range CFI without extensions
  return `${ancestorCfi},${startPath},${endPath}`
}

const generateSpineCfi = (
  spineIndex: number,
  spineId?: string,
  options: GenerateOptions = {},
  isFinal?: boolean,
) => {
  const bracket = ""
  const cfiIndex = (spineIndex + 1) * 2
  let cfi = `/6/${cfiIndex}`

  if (spineId) {
    cfi += `[${cfiEscape(spineId)}]`
  }

  cfi = isFinal ? addExtensions(cfi, options.extensions) : cfi

  return `${cfi}${bracket}!`
}

/**
 * Generate a CFI from a DOM node or position
 *
 * @example
 * // Generate CFI for a single node
 * const cfi = generate(node);
 *
 * @example
 * // Generate CFI for a text node with offset
 * const cfi = generate({ node: textNode, offset: 5 });
 *
 * @example
 * // Generate CFI for a video with temporal offset
 * const cfi = generate({ node: videoElement, temporal: 45.5 });
 *
 * @example
 * // Generate CFI for an image with spatial coordinates
 * const cfi = generate({ node: imageElement, spatial: [50, 75] });
 *
 * @example
 * // Generate a range CFI
 * const cfi = generate({
 *   start: { node: startNode, offset: 0 },
 *   end: { node: endNode, offset: 10 }
 * });
 *
 * @example
 * // Generate a CFI with spine indirection
 * const cfi = generate({
 *   node: chapterNode,
 *   spineIndex: 1,
 *   spineId: 'chap01ref'
 * });
 *
 * @example
 * // Generate a CFI for a spine item without a node
 * const cfi = generate({
 *   spineIndex: 1,
 *   spineId: 'chap01ref'
 * });
 *
 * @example
 * // Generate a robust CFI with text assertions
 * const cfi = generate(node, {
 *   includeTextAssertions: true,
 *   textAssertionLength: 15
 * });
 */
export function generate(
  position: Node | CfiPosition | { start: CfiPosition; end: CfiPosition },
  options: GenerateOptions = {},
): string {
  // Case 1: Simple Node
  if (isNode(position)) {
    return `epubcfi(${generatePoint(position, undefined, options)})`
  }

  let cfi = ""

  // Non Range case
  if (!("start" in position)) {
    // Add spine indirection if specified
    if (position.spineIndex !== undefined) {
      cfi = generateSpineCfi(
        position.spineIndex,
        position.spineId,
        options,
        !position.node,
      )

      if (!position.node) {
        return `epubcfi(${cfi})`
      }
    }

    // Add the node path
    cfi += generatePoint(
      position.node ?? null,
      position.offset,
      options,
      position,
    )

    return `epubcfi(${cfi})`
  }

  // Range case
  const { start, end } = position

  // Add spine indirection if specified (use start position's spine info)
  if (start.spineIndex !== undefined) {
    cfi = generateSpineCfi(
      start.spineIndex,
      start.spineId,
      options,
      !start.node,
    )
  }

  if (start.node && end.node) {
    // Add the range path
    cfi += generateRange(
      start.node,
      start.offset ?? 0,
      end.node,
      end.offset ?? 0,
      options,
      start,
      end,
    )
  }

  return `epubcfi(${cfi})`
}
