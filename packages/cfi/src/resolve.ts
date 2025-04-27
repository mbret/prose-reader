import { type CfiPart, type CfiRange, type ParsedCfi, parse } from "./parse"
import { isNode, isTextNode } from "./utils"

/**
 * Options for resolving a CFI
 */
interface ResolveOptions {
  /**
   * Whether to throw an error if the CFI cannot be resolved
   * @default false
   */
  throwOnError?: boolean

  /**
   * Whether to return a range instead of a single node
   * @default false
   */
  asRange?: boolean
}

/**
 * Result of resolving a CFI
 */
interface ResolveResult {
  /**
   * The resolved node or range
   */
  node: Node | Range | null

  /**
   * Whether the result is a range
   */
  isRange: boolean

  /**
   * The character offset if applicable
   */
  offset?: number | number[]

  /**
   * The temporal offset if applicable
   */
  temporal?: number

  /**
   * The spatial offset if applicable
   */
  spatial?: number[]

  /**
   * The side bias if applicable
   */
  side?: string

  /**
   * Any extension parameters in the CFI
   */
  extensions?: Record<string, string>
}

/**
 * Check if a parsed CFI is a range
 */
function isCfiRange(parsed: ParsedCfi): parsed is CfiRange {
  return (
    parsed !== null &&
    typeof parsed === "object" &&
    "parent" in parsed &&
    "start" in parsed &&
    "end" in parsed
  )
}

/**
 * Resolves a CFI string to a DOM node or range
 */
export function resolve(
  cfi: string | ParsedCfi,
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  // If already parsed, use it directly
  if (typeof cfi !== "string") {
    return resolveParsed(cfi, document, options)
  }

  try {
    // Parse the CFI once and use the parsed object for all checks
    const parsedCfi = parse(cfi)

    // Handle range CFIs when asRange is true
    if (options.asRange && isCfiRange(parsedCfi)) {
      return resolveRange(parsedCfi, document, { ...options, asRange: true })
    }

    // For all other cases, use the parsed CFI
    return resolveParsed(parsedCfi, document, options)
  } catch (error) {
    if (options.throwOnError) {
      throw error
    }
    return { node: null, isRange: false }
  }
}

/**
 * Resolves a parsed CFI to a DOM node or range
 */
function resolveParsed(
  parsed: ParsedCfi,
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  const { throwOnError = false, asRange = false } = options

  try {
    // Handle range CFIs
    if (isCfiRange(parsed)) {
      if (asRange) {
        return resolveRange(parsed, document, { ...options, asRange: true })
      }
      // If not as range, use the start point
      const firstPath = parsed.start[0] || []
      return resolvePath(firstPath, document, options)
    }

    // Handle path CFIs
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Handle path CFI (indirection)
      if (parsed[0]) {
        return resolvePath(parsed[0], document, options)
      }
    }

    if (throwOnError) {
      throw new Error("Invalid CFI structure")
    }

    return { node: null, isRange: false }
  } catch (error) {
    if (throwOnError) {
      throw error
    }
    return { node: null, isRange: false }
  }
}

/**
 * Resolves a CFI range to a DOM range
 */
function resolveRange(
  range: CfiRange,
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  const { throwOnError = false } = options

  try {
    // Get the parent path and start/end paths
    const parentPath = range.parent[0] || []
    const startPath = range.start[0] || []
    const endPath = range.end[0] || []

    // Find the parent node
    let parentNode: Node | null = document.documentElement
    if (parentPath.length > 0) {
      const parentResult = resolvePath(parentPath, document, { throwOnError })
      if (isNode(parentResult.node)) {
        parentNode = parentResult.node
      }
    }

    if (!parentNode) {
      if (throwOnError) {
        throw new Error("Failed to resolve parent node in CFI range")
      }
      return { node: null, isRange: false }
    }

    // Find the start and end nodes
    const startResult = resolvePath(startPath, document, { throwOnError })
    const endResult = resolvePath(endPath, document, { throwOnError })

    // Check that we have valid Node objects
    if (!isNode(startResult.node) || !isNode(endResult.node)) {
      if (throwOnError) {
        throw new Error("Failed to resolve start or end node in CFI range")
      }
      return { node: null, isRange: false }
    }

    const startNode = startResult.node
    const endNode = endResult.node

    let domRange: Range
    // Check if we need to create a Range
    if (document.createRange) {
      domRange = document.createRange()
    } else {
      // If document.createRange is not available, create a minimal object
      domRange = {} as Range
      Object.defineProperties(domRange, {
        startContainer: { value: startNode },
        endContainer: { value: endNode },
        startOffset: { value: startResult.offset || 0 },
        endOffset: { value: endResult.offset || 0 },
      })
    }

    // If we have an actual Range object, set its properties
    if (typeof domRange.setStart === "function") {
      const startOffset =
        startResult.offset !== undefined
          ? Array.isArray(startResult.offset)
            ? startResult.offset[0]
            : startResult.offset
          : 0

      const endOffset =
        endResult.offset !== undefined
          ? Array.isArray(endResult.offset)
            ? endResult.offset[0]
            : endResult.offset
          : 0

      domRange.setStart(startNode, startOffset || 0)
      domRange.setEnd(endNode, endOffset || 0)
    }

    return {
      node: domRange,
      isRange: true,
      offset: startResult.offset,
      temporal: startResult.temporal,
      spatial: startResult.spatial,
      side: startResult.side,
    }
  } catch (error) {
    if (throwOnError) {
      throw error
    }
    return { node: null, isRange: false }
  }
}

/**
 * Extracts side bias from a CFI part
 */
function extractSideBias(part: CfiPart | undefined): string | undefined {
  if (!part) return undefined

  // Return the side if it exists
  if (part.side) return part.side

  // Look for side bias in text assertions
  if (part.text && part.text.length > 0) {
    const text = part.text[0]
    // The CFI spec says side bias can be a=after or b=before
    if (text) {
      const sideBiasMatch = text.match(/^([ab])$/)
      if (sideBiasMatch) {
        return sideBiasMatch[1]
      }
    }
  }

  return undefined
}

/**
 * Determines if a step in a CFI path is for a text node
 * Text nodes have indices that are not doubled (odd numbers in CFI)
 */
function isTextNodeStep(part: CfiPart): boolean {
  // Per the CFI spec, element indices are always even numbers
  // So if we have an odd number, it's likely a text node or other non-element node
  return part.index % 2 !== 0
}

/**
 * Resolves a CFI path to a DOM node
 */
function resolvePath(
  path: CfiPart[],
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  const { throwOnError = false, asRange = false } = options

  if (!document) {
    if (throwOnError) {
      throw new Error("Document is not available")
    }
    return { node: null, isRange: false }
  }

  // Look for an element with an ID first
  const nodeById = findNodeById(document, path)
  if (nodeById) {
    // Check if the last step indicates we need a child of this node
    const lastPart = path.length > 0 ? path[path.length - 1] : undefined

    // Handle case where we have element with ID and we need to get to a text node child
    if (lastPart && isTextNodeStep(lastPart)) {
      // Text nodes use 1-based indexing without doubling
      const childIndex = lastPart.index - 1

      if (childIndex >= 0 && childIndex < nodeById.childNodes.length) {
        const childNode = nodeById.childNodes[childIndex] as Node

        const sideBias = extractSideBias(lastPart)
        const extensions = lastPart?.extensions

        return {
          node: childNode,
          isRange: false,
          offset: lastPart?.offset,
          temporal: lastPart?.temporal,
          spatial: lastPart?.spatial,
          side: sideBias,
          extensions,
        }
      }
    }

    // If no text node reference or it couldn't be found, use the node found by ID
    const sideBias = extractSideBias(lastPart)
    const extensions = lastPart?.extensions

    if (asRange) {
      // Create a range
      let range: Range
      if (document.createRange) {
        range = document.createRange()
        range.selectNodeContents(nodeById)

        // Adjust for offset
        if (lastPart?.offset !== undefined) {
          const offset = Array.isArray(lastPart.offset)
            ? lastPart.offset[0]
            : lastPart.offset
          if (isTextNode(nodeById)) {
            range.setStart(nodeById, offset || 0)
          }
        }
      } else {
        // Fallback
        range = {} as Range
        Object.defineProperties(range, {
          startContainer: { value: nodeById },
          endContainer: { value: nodeById },
          startOffset: { value: lastPart?.offset || 0 },
          endOffset: { value: lastPart?.offset || 0 },
        })
      }

      return {
        node: range,
        isRange: true,
        offset: lastPart?.offset,
        temporal: lastPart?.temporal,
        spatial: lastPart?.spatial,
        side: sideBias,
        extensions,
      }
    }

    return {
      node: nodeById,
      isRange: false,
      offset: lastPart?.offset,
      temporal: lastPart?.temporal,
      spatial: lastPart?.spatial,
      side: sideBias,
      extensions,
    }
  }

  // If no ID match, traverse the path
  let currentNode: Node | null = document.documentElement

  // For each part in the path
  for (let i = 0; i < path.length; i++) {
    const part = path[i]
    if (!currentNode || !part) break

    // Handle text nodes differently than element nodes
    if (isTextNodeStep(part)) {
      // For text nodes, we use the raw index (minus 1 for 0-based indexing)
      const nodeIndex = part.index - 1

      if (nodeIndex >= 0 && nodeIndex < currentNode.childNodes.length) {
        // We know this is a valid index, so the child node must exist
        currentNode = currentNode.childNodes[nodeIndex] as Node
      } else {
        if (throwOnError) {
          throw new Error(`Invalid text node index: ${part.index}`)
        }
        currentNode = null
        break
      }
    } else {
      // For element nodes, we need to filter to just element nodes
      // Get child nodes and try to navigate to the right one
      const childElements: Node[] = Array.from(currentNode.childNodes).filter(
        (node) => node.nodeType === Node.ELEMENT_NODE,
      )

      // Calculate the actual index (CFI indices are 1-based and doubled for elements)
      const index = Math.floor(part.index / 2) - 1

      if (index >= 0 && index < childElements.length) {
        const nextNode = childElements[index]
        if (nextNode) {
          currentNode = nextNode
        }
      } else {
        if (throwOnError) {
          throw new Error(`Invalid element step index: ${part.index}`)
        }

        currentNode = null
        break
      }
    }
  }

  if (!currentNode) {
    if (throwOnError) {
      throw new Error("Failed to resolve CFI path")
    }
    return { node: null, isRange: false }
  }

  // Prepare the result
  const lastPart = path.length > 0 ? path[path.length - 1] : undefined
  const sideBias = extractSideBias(lastPart)
  const extensions = lastPart?.extensions

  const result: ResolveResult = {
    node: currentNode,
    isRange: false,
    offset: lastPart?.offset,
    temporal: lastPart?.temporal,
    spatial: lastPart?.spatial,
    side: sideBias,
    extensions,
  }

  if (asRange && currentNode) {
    // Create a range
    let range: Range
    if (document.createRange) {
      range = document.createRange()
      range.selectNodeContents(currentNode)

      // Adjust for offset
      if (lastPart?.offset !== undefined) {
        const offset = Array.isArray(lastPart.offset)
          ? lastPart.offset[0]
          : lastPart.offset
        if (isTextNode(currentNode)) {
          range.setStart(currentNode, offset || 0)
        }
      }
    } else {
      // Fallback
      range = {} as Range
      Object.defineProperties(range, {
        startContainer: { value: currentNode },
        endContainer: { value: currentNode },
        startOffset: { value: lastPart?.offset || 0 },
        endOffset: { value: lastPart?.offset || 0 },
      })
    }

    result.node = range
    result.isRange = true
  }

  return result
}

/**
 * Find a node by ID from a CFI path
 */
function findNodeById(document: Document, parts: CfiPart[]): Node | null {
  if (!parts || parts.length === 0) return null

  // Check for nested IDs like "/4/2[chap01ref]/2[chap02ref]"
  // If the last part has an ID, use that
  const lastPart = parts[parts.length - 1]
  if (lastPart?.id) {
    const node = document.getElementById(lastPart.id)
    if (node) return node
  }

  // Otherwise check all parts for an ID
  for (const part of parts) {
    if (part?.id) {
      const node = document.getElementById(part.id)
      if (node) return node
    }
  }

  return null
}
