import { type CfiPart, type CfiRange, type ParsedCfi, parse } from "./parse"
import {
  isIndirectionOnly,
  isNode,
  isParsedCfiRange,
  isTextNode,
} from "./utils"

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
 * Resolves a CFI string to a DOM node or range
 */
export function resolve(
  cfi: string | ParsedCfi,
  document: Document,
  options: Omit<ResolveOptions, "asRange"> & { asRange: true },
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
    const parsedCfi = typeof cfi !== "string" ? cfi : parse(cfi)

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
  if (isParsedCfiRange(parsed)) {
    return resolveRange(parsed, document)
  }

  // Check if this is a CFI with only indirection (e.g., "epubcfi(/6/2[cover]!)")
  if (isIndirectionOnly(parsed)) {
    // According to the spec, we cannot resolve beyond the indirection point
    // so we return null for the node
    return createNodeResultObject(null)
  }

  const nonIndirectionPart = parsed.at(-1)

  // Handle path CFI (indirection)
  if (nonIndirectionPart) {
    return resolvePath(nonIndirectionPart, document, options)
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
    ...startResult,
    node: domRange,
    isRange: true,
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

function createBaseResultObject(part?: CfiPart) {
  const sideBias = extractSideBias(part)
  const extensions = part?.extensions

  return {
    offset: part?.offset,
    temporal: part?.temporal,
    spatial: part?.spatial,
    side: sideBias,
    extensions,
  }
}

function createNodeResultObject(
  node: Node | null,
  part?: CfiPart,
): ResolveResult {
  return {
    node,
    isRange: false,
    ...createBaseResultObject(part),
  }
}

function createRangeResultObject(
  node: Range | null,
  part?: CfiPart,
): ResolveResult {
  return {
    node,
    isRange: true,
    ...createBaseResultObject(part),
  }
}

/**
 * Creates a DOM range for a given node with optional offset
 */
function createRangeForNode(
  document: Document,
  node: Node,
  offset?: number | number[],
): Range {
  const range = document.createRange()
  range.selectNodeContents(node)

  if (offset !== undefined) {
    const offsetValue = Array.isArray(offset) ? offset[0] : offset
    if (isTextNode(node)) {
      range.setStart(node, offsetValue || 0)
    }
  }

  return range
}

/**
 * Traverses the DOM tree based on CFI path parts
 */
function traverseNodePath(
  currentNode: Node | null,
  path: CfiPart[],
  startIndex: number,
  throwOnError: boolean,
): Node | null {
  let _currentNode = currentNode

  for (let i = startIndex; i < path.length; i++) {
    const part = path[i]
    if (!_currentNode || !part) break

    if (isTextNodeStep(part)) {
      const nodeIndex = part.index - 1
      if (nodeIndex >= 0 && nodeIndex < _currentNode.childNodes.length) {
        _currentNode = _currentNode.childNodes[nodeIndex] as Node
      } else {
        if (throwOnError) {
          throw new Error(`Invalid text node index: ${part.index}`)
        }
        _currentNode = null
        break
      }
    } else {
      const childElements: Node[] = Array.from(_currentNode.childNodes).filter(
        (node) => node.nodeType === Node.ELEMENT_NODE,
      )
      const index = Math.floor(part.index / 2) - 1

      if (index >= 0 && index < childElements.length) {
        const nextNode = childElements[index]
        if (nextNode) {
          _currentNode = nextNode
        }
      } else {
        if (throwOnError) {
          throw new Error(`Invalid element step index: ${part.index}`)
        }
        _currentNode = null
        break
      }
    }
  }

  return _currentNode
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
    return createNodeResultObject(null)
  }

  // Look for an element with an ID first
  const { node: nodeById, remainingPathIndex } = findNodeById(document, path)

  // If there's no remaining path to process after the ID node, return the ID node
  if (nodeById && remainingPathIndex >= path.length) {
    const lastPart = path.at(-1)

    if (lastPart && isTextNodeStep(lastPart)) {
      const childIndex = lastPart.index - 1
      if (childIndex >= 0 && childIndex < nodeById.childNodes.length) {
        const childNode = nodeById.childNodes[childIndex] as Node
        return createNodeResultObject(childNode, lastPart)
      }
    }

    if (asRange) {
      const range = createRangeForNode(document, nodeById, lastPart?.offset)
      return createRangeResultObject(range, lastPart)
    }

    return createNodeResultObject(nodeById, lastPart)
  }

  // Start traversal from the ID node if found, otherwise start from the document root
  let currentNode: Node | null = nodeById || document.documentElement
  const startIndex = nodeById ? remainingPathIndex : 0

  // Handle virtual positions
  if (asRange && path.length > 0) {
    const lastPart = path[path.length - 1]
    if (lastPart && !isTextNodeStep(lastPart)) {
      // Handle position before first element (index 0)
      if (lastPart.index === 0 && currentNode) {
        const range = document.createRange()
        range.setStart(currentNode, 0)
        range.setEnd(currentNode, 0)
        return createRangeResultObject(range, lastPart)
      }

      // Handle position after last element
      const parentNode = traverseNodePath(
        currentNode,
        path.slice(0, -1),
        startIndex,
        throwOnError,
      )
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
          return createRangeResultObject(range, lastPart)
        }
      }
    }
  }

  currentNode = traverseNodePath(currentNode, path, startIndex, throwOnError)

  if (!currentNode) {
    if (throwOnError) {
      throw new Error("Failed to resolve CFI path")
    }
    return createNodeResultObject(null)
  }

  const lastPart = path.at(-1)
  if (asRange) {
    const range = createRangeForNode(document, currentNode, lastPart?.offset)
    return createRangeResultObject(range, lastPart)
  }

  return createNodeResultObject(currentNode, lastPart)
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
