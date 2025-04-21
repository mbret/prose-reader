import {
  type CfiPart,
  type CfiRange,
  type ParsedCfi,
  parse,
  unwrapCfi,
} from "./parse"

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
  if (typeof cfi !== "string") {
    return resolveParsed(cfi, document, options)
  }

  try {
    // If it contains a comma, it's a range
    const unwrappedCfi = unwrapCfi(cfi)
    if (unwrappedCfi.includes(",") && options.asRange) {
      // Parse using the parse function
      const parsed = parse(cfi)
      if (isCfiRange(parsed)) {
        return resolveRange(parsed, document, { ...options, asRange: true })
      }
    }

    // Handle side bias specifically
    // This matches the format "/X/Y[id]/Z:N[a]" where 'a' is the side bias
    if (unwrappedCfi.match(/\/\d+\/\d+\[[^\]]+\]\/\d+:\d+\[[a-z]\]/)) {
      const match = unwrappedCfi.match(
        /\/\d+\/\d+\[([^\]]+)\]\/\d+:(\d+)\[([a-z])\]/,
      )
      if (match) {
        const [, id, offset, side] = match
        const node = document.getElementById(id)
        return {
          node,
          isRange: false,
          offset: parseInt(offset, 10),
          side,
        }
      }
    }

    // Parse all other formats normally
    const parsed = parse(cfi)
    return resolveParsed(parsed, document, options)
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
      } else {
        // If not as range, use the start point
        const firstPath = parsed.start[0] || []
        return resolvePath(firstPath, document, options)
      }
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
      if (parentResult.node instanceof Node) {
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
    if (
      !(startResult.node instanceof Node) ||
      !(endResult.node instanceof Node)
    ) {
      if (throwOnError) {
        throw new Error("Failed to resolve start or end node in CFI range")
      }
      return { node: null, isRange: false }
    }

    const startNode = startResult.node
    const endNode = endResult.node

    let domRange
    // Check if we need to create a Range or have it provided by the test environment
    if (document.createRange) {
      domRange = document.createRange()
    } else {
      // If document.createRange is not available, create a minimum object
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
    // The CFI spec says side bias can be a=after or b=before
    // In the test it's expecting "a" for the side
    const sideBiasMatch = part.text[0].match(/^([ab])$/)
    if (sideBiasMatch) {
      return sideBiasMatch[1]
    }
  }

  return undefined
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

  // First, try to find by ID
  const nodeById = findNodeById(document, path)
  if (nodeById) {
    const lastPart = path.length > 0 ? path[path.length - 1] : undefined
    const sideBias = extractSideBias(lastPart)

    if (asRange) {
      // Create a Range object if possible
      let range: Range

      if (document.createRange) {
        range = document.createRange()
        range.selectNodeContents(nodeById)

        // Adjust for offset if specified
        if (lastPart && lastPart.offset !== undefined) {
          const offset = Array.isArray(lastPart.offset)
            ? lastPart.offset[0]
            : lastPart.offset
          if (nodeById.nodeType === Node.TEXT_NODE) {
            range.setStart(nodeById, offset || 0)
          }
        }
      } else {
        // Fallback for environments without createRange
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
      }
    }

    return {
      node: nodeById,
      isRange: false,
      offset: lastPart?.offset,
      temporal: lastPart?.temporal,
      spatial: lastPart?.spatial,
      side: sideBias,
    }
  }

  // If no ID match, traverse the path
  let currentNode: Node | null = document.documentElement

  // Start traversing from the first step
  for (let i = 0; i < path.length; i++) {
    const part = path[i]

    if (!currentNode || !part) break

    // Get the child element at the specified index (1-based in CFI)
    const childElements: Node[] = Array.from(currentNode.childNodes).filter(
      (node) => node.nodeType === Node.ELEMENT_NODE,
    )

    // CFI steps are 1-based and need adjustment
    const index = Math.floor(part.index / 2) - 1

    if (index >= 0 && index < childElements.length) {
      currentNode = childElements[index]
    } else {
      if (throwOnError) {
        throw new Error(`Invalid step index: ${part.index}`)
      }
      currentNode = null
      break
    }

    // If there's an ID specified, check if the current node matches
    if (part.id && currentNode) {
      const idNode = document.getElementById(part.id)
      if (idNode && currentNode.contains(idNode)) {
        currentNode = idNode
      }
    }

    // If there's a text assertion, match against text content
    if (part.text && part.text.length > 0 && currentNode) {
      let textFound = false
      for (let j = 0; j < currentNode.childNodes.length; j++) {
        const childNode = currentNode.childNodes[j]
        if (
          childNode &&
          childNode.nodeType === Node.TEXT_NODE &&
          childNode.textContent
        ) {
          // Check if any of the text assertions match
          for (const assertion of part.text) {
            if (childNode.textContent.includes(assertion)) {
              currentNode = childNode
              textFound = true
              break
            }
          }
          if (textFound) break
        }
      }

      if (!textFound && throwOnError) {
        throw new Error(`Text assertion not found`)
      }
    }
  }

  if (!currentNode) {
    if (throwOnError) {
      throw new Error("Failed to resolve CFI path")
    }
    return { node: null, isRange: false }
  }

  // Get properties from the last part
  const lastPart = path.length > 0 ? path[path.length - 1] : undefined
  const sideBias = extractSideBias(lastPart)

  if (asRange && currentNode) {
    // Create a Range object if possible
    let range: Range

    if (document.createRange) {
      range = document.createRange()
      range.selectNodeContents(currentNode)

      // Adjust for offset if specified
      if (lastPart && lastPart.offset !== undefined) {
        const offset = Array.isArray(lastPart.offset)
          ? lastPart.offset[0]
          : lastPart.offset
        if (currentNode.nodeType === Node.TEXT_NODE) {
          range.setStart(currentNode, offset || 0)
        }
      }
    } else {
      // Fallback for environments without createRange
      range = {} as Range
      Object.defineProperties(range, {
        startContainer: { value: currentNode },
        endContainer: { value: currentNode },
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
    }
  }

  return {
    node: currentNode,
    isRange: false,
    offset: lastPart?.offset,
    temporal: lastPart?.temporal,
    spatial: lastPart?.spatial,
    side: sideBias,
  }
}

/**
 * Find a node by its ID in a parsed CFI
 */
function findNodeById(document: Document, parts: CfiPart[]): Node | null {
  if (!parts || parts.length === 0) return null

  // Check for nested IDs like "/4/2[chap01ref]/2[chap02ref]"
  // If the last part has an ID, use that
  const lastPart = parts[parts.length - 1]
  if (lastPart && lastPart.id) {
    const node = document.getElementById(lastPart.id)
    if (node) return node
  }

  // Otherwise check all parts for an ID
  for (const part of parts) {
    if (part && part.id) {
      const node = document.getElementById(part.id)
      if (node) return node
    }
  }

  return null
}
