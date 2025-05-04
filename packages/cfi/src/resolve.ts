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
interface ResolveRangeResult extends ResolveResultBase {
  node: Range | null
  isRange: true
}

interface ResolveResultBase {
  offset?: number[] | number

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

interface ResolveNodeResult extends ResolveResultBase {
  node: Node | null
  isRange: false
}

type ResolveResult = ResolveNodeResult | ResolveRangeResult

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

/**
 * Resolves a CFI string to a DOM node or range
 */
export function resolve(
  cfi: string | ParsedCfi,
  document: Document,
  options?: Omit<ResolveOptions, "asRange"> & { asRange: true },
): ResolveRangeResult
export function resolve(
  cfi: string | ParsedCfi,
  document: Document,
  options?: ResolveOptions,
): ResolveResult
export function resolve(
  cfi: string | ParsedCfi,
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  try {
    // If already parsed, use it directly
    if (typeof cfi !== "string") {
      return resolveParsed(cfi, document, options)
    }

    // Parse the CFI once and use the parsed object for all checks
    const parsedCfi = parse(cfi)

    // Handle range CFIs when asRange is true
    if (options.asRange && isParsedCfiRange(parsedCfi)) {
      return resolveRange(parsedCfi, document)
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
  options: { asRange?: boolean } = { asRange: false },
): ResolveResult {
  const { asRange = false } = options

  // Handle range CFIs
  if (isParsedCfiRange(parsed)) {
    if (asRange) {
      return resolveRange(parsed, document)
    }

    // If not as range, use the start point
    const firstPath = parsed.start[0] || []
    return resolvePath(firstPath, document, options)
  }

  // Handle path CFI (indirection)
  if (parsed[0]) {
    return resolvePath(parsed[0], document, options)
  }

  throw new Error("Invalid CFI structure")
}

/**
 * Resolves a CFI range to a DOM range
 */
function resolveRange(range: CfiRange, document: Document): ResolveResult {
  // Get the parent path and start/end paths
  const parentPath = range.parent[0] || []
  const startPath = range.start[0] || []
  const endPath = range.end[0] || []

  // Find the parent node
  let parentNode: Node | null = document.documentElement

  if (parentPath.length > 0) {
    const parentResult = resolvePath(parentPath, document)
    if (isNode(parentResult.node)) {
      parentNode = parentResult.node
    }
  }

  if (!parentNode) {
    throw new Error("Failed to resolve parent node in CFI range")
  }

  // Find the start and end nodes
  const startResult = resolvePath(startPath, document)
  const endResult = resolvePath(endPath, document)

  // Check that we have valid Node objects
  if (!isNode(startResult.node) || !isNode(endResult.node)) {
    throw new Error("Failed to resolve start or end node in CFI range")
  }

  const startNode = startResult.node
  const endNode = endResult.node

  const domRange = document.createRange()
  domRange.setStart(
    startNode,
    (Array.isArray(startResult.offset)
      ? startResult.offset[0]
      : startResult.offset) ?? 0,
  )
  domRange.setEnd(
    endNode,
    (Array.isArray(endResult.offset)
      ? endResult.offset[0]
      : endResult.offset) ?? 0,
  )

  return {
    node: domRange,
    isRange: true,
    offset: startResult.offset,
    temporal: startResult.temporal,
    spatial: startResult.spatial,
    side: startResult.side,
    extensions: startResult.extensions,
  }
}

/**
 * Extracts side bias from a CFI part
 */
function extractSideBias(part: CfiPart | undefined): string | undefined {
  // Return the side if it exists
  if (part?.side) return part.side

  // Look for side bias in text assertions
  if (part?.text && part.text.length > 0) {
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
 * Returns the extensions from the last valid part of a parsed CFI
 */
export function resolveExtensions(parsedCfi: ParsedCfi) {
  const parts = isParsedCfiRange(parsedCfi) ? parsedCfi.end : parsedCfi
  const lastPart = parts.at(-1)
  const lastPartPath = lastPart?.at(-1)

  return lastPartPath?.extensions
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
  const { node: nodeById, remainingPathIndex } = findNodeById(document, path)

  // If there's no remaining path to process after the ID node, return the ID node
  if (nodeById && remainingPathIndex >= path.length) {
    const lastPart = path.at(-1)
    const extensions = lastPart?.extensions
    // If no text node reference or it couldn't be found, use the node found by ID
    const sideBias = extractSideBias(lastPart)
    const commonData = {
      offset: lastPart?.offset,
      temporal: lastPart?.temporal,
      spatial: lastPart?.spatial,
      side: sideBias,
      extensions,
    }

    // Handle case where we have element with ID and we need to get to a text node child
    if (lastPart && isTextNodeStep(lastPart)) {
      // Text nodes use 1-based indexing without doubling
      const childIndex = lastPart.index - 1

      if (childIndex >= 0 && childIndex < nodeById.childNodes.length) {
        const childNode = nodeById.childNodes[childIndex] as Node

        return {
          node: childNode,
          isRange: false,
          ...commonData,
        }
      }
    }

    if (asRange) {
      // Create a range
      const range = document.createRange()
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

      range.setEnd(nodeById, lastPart?.offset || 0)

      return {
        node: range,
        isRange: true,
        ...commonData,
      }
    }

    return {
      node: nodeById,
      isRange: false,
      ...commonData,
    }
  }

  // Start traversal from the ID node if found, otherwise start from the document root
  let currentNode: Node | null = nodeById || document.documentElement

  // Get the starting index for path traversal
  const startIndex = nodeById ? remainingPathIndex : 0

  // Special case: Virtual positions (before first element or after last element)
  // only applicable when asRange is true
  if (asRange && path.length > 0) {
    const lastPart = path[path.length - 1]

    // Check if the last part might be a virtual position indicator
    if (lastPart && !isTextNodeStep(lastPart)) {
      // Handle position before first element (index 0)
      if (lastPart.index === 0 && currentNode) {
        const range = document.createRange()
        range.setStart(currentNode, 0)
        range.setEnd(currentNode, 0)

        return {
          node: range,
          isRange: true,
          offset: lastPart.offset,
          temporal: lastPart.temporal,
          spatial: lastPart.spatial,
          side: extractSideBias(lastPart),
          extensions: lastPart.extensions,
        }
      }

      // Parent node for navigation
      let parentNode: Node | null = currentNode

      // Navigate through all parts except the last one
      for (let i = startIndex; i < path.length - 1; i++) {
        const part = path[i]
        if (!parentNode || !part) break

        if (isTextNodeStep(part)) {
          const nodeIndex = part.index - 1
          if (nodeIndex >= 0 && nodeIndex < parentNode.childNodes.length) {
            parentNode = parentNode.childNodes[nodeIndex] as Node
          } else {
            parentNode = null
            break
          }
        } else {
          const childElements: Node[] = Array.from(
            parentNode.childNodes,
          ).filter((node) => node.nodeType === Node.ELEMENT_NODE)
          const index = Math.floor(part.index / 2) - 1

          if (index >= 0 && index < childElements.length) {
            const nextNode = childElements[index]
            if (nextNode) {
              parentNode = nextNode
            } else {
              parentNode = null
              break
            }
          } else {
            parentNode = null
            break
          }
        }
      }

      // If we still have a parent node, handle possible after-last-element position
      if (parentNode) {
        const childElements: Node[] = Array.from(parentNode.childNodes).filter(
          (node) => node.nodeType === Node.ELEMENT_NODE,
        )
        const index = Math.floor(lastPart.index / 2) - 1

        // If the index is equal to the number of child elements, it's a position after the last element
        if (index === childElements.length) {
          const range = document.createRange()
          range.selectNodeContents(parentNode)
          range.collapse(false) // Collapse to end

          return {
            node: range,
            isRange: true,
            offset: lastPart.offset,
            temporal: lastPart.temporal,
            spatial: lastPart.spatial,
            side: extractSideBias(lastPart),
            extensions: lastPart.extensions,
          }
        }
      }
    }
  }

  // For each part in the path
  for (let i = startIndex; i < path.length; i++) {
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
  const lastPart = path.at(-1)
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

  if (asRange) {
    const range = document.createRange()
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

    return {
      ...result,
      node: range,
      isRange: true,
    }
  }

  return result
}

/**
 * Find a node by ID from a CFI path.
 * Starting from the last part and working backwards.
 * Returns the node and the remaining path that needs to be processed.
 */
function findNodeById(
  document: Document,
  parts: CfiPart[],
): { node: Node | null; remainingPathIndex: number } {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    if (part?.id) {
      const node = document.getElementById(part.id)
      if (node) return { node, remainingPathIndex: i + 1 }
    }
  }

  return { node: null, remainingPathIndex: 0 }
}
