import { parse, type ParsedCfi, type ParsedCfiPart } from "./parse"

/**
 * Options for resolving a CFI
 */
export interface ResolveOptions {
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
export interface ResolveResult {
  /**
   * The resolved node or range
   */
  node: Node | Range

  /**
   * Whether the result is a range
   */
  isRange: boolean

  /**
   * The character offset if applicable
   */
  offset?: number

  /**
   * The temporal offset if applicable
   */
  temporal?: number

  /**
   * The spatial offset if applicable
   */
  spatial?: [number, number]

  /**
   * The side bias if applicable
   */
  side?: "a" | "b"
}

/**
 * Resolves a CFI string to a DOM node or range
 * @param cfi The CFI string to resolve
 * @param document The document to resolve against
 * @param options Options for resolving
 * @returns The resolved node or range
 */
export function resolve(
  cfi: string,
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  const parsed = parse(cfi)
  return resolveParsed(parsed, document, options)
}

/**
 * Resolves a parsed CFI to a DOM node or range
 * @param parsed The parsed CFI to resolve
 * @param document The document to resolve against
 * @param options Options for resolving
 * @returns The resolved node or range
 */
export function resolveParsed(
  parsed: ParsedCfi,
  document: Document,
  options: ResolveOptions = {},
): ResolveResult {
  const { throwOnError = false, asRange = false } = options

  // Handle CFI ranges
  if ("parent" in parsed) {
    if (asRange) {
      const result = resolveRange(parsed, document, options)
      return {
        ...result,
        isRange: true
      }
    } else {
      // Default to start of range
      const result = resolveParsed(
        parsed.parent.concat(parsed.start),
        document,
        options,
      )
      return {
        ...result,
        isRange: false
      }
    }
  }

  // Handle indirection
  if (parsed.length > 1 && parsed[0].length > 0 && parsed[0][0].index === 0) {
    // This is an indirection, resolve the first part first
    const indirectResult = resolveParsed(parsed[0], document, options)
    if (!indirectResult.node) {
      if (throwOnError) {
        throw new Error("Failed to resolve indirect CFI")
      }
      return { node: null, isRange: false }
    }

    // Then resolve the second part against the result
    return resolveParsed(parsed[1], indirectResult.node.ownerDocument, options)
  }

  // Resolve a single path
  const result = resolvePath(parsed[0], document, options)
  return {
    ...result,
    isRange: false
  }
}

/**
 * Resolves a CFI range to a DOM range
 * @param range The CFI range to resolve
 * @param document The document to resolve against
 * @param options Options for resolving
 * @returns The resolved range
 */
function resolveRange(
  range: ParsedCfi & {
    parent: ParsedCfiPart[]
    start: ParsedCfiPart[]
    end: ParsedCfiPart[]
  },
  document: Document,
  options: ResolveOptions,
): ResolveResult {
  const { throwOnError = false } = options

  // Resolve the parent path
  const parentResult = resolvePath(range.parent, document, options)
  if (!parentResult.node) {
    if (throwOnError) {
      throw new Error("Failed to resolve parent path of range")
    }
    return { node: document.createRange(), isRange: false }
  }

  // Resolve the start path
  const startResult = resolvePath(
    range.start,
    parentResult.node.ownerDocument,
    options,
  )
  if (!startResult.node) {
    if (throwOnError) {
      throw new Error("Failed to resolve start path of range")
    }
    return { node: document.createRange(), isRange: false }
  }

  // Resolve the end path
  const endResult = resolvePath(
    range.end,
    parentResult.node.ownerDocument,
    options,
  )
  if (!endResult.node) {
    if (throwOnError) {
      throw new Error("Failed to resolve end path of range")
    }
    return { node: document.createRange(), isRange: false }
  }

  // Create a range
  const rangeObj = document.createRange()
  
  // Ensure we're working with Node objects, not Range objects
  const startNode = startResult.node instanceof Range ? startResult.node.startContainer : startResult.node;
  const endNode = endResult.node instanceof Range ? endResult.node.endContainer : endResult.node;
  
  rangeObj.setStart(startNode, startResult.offset || 0)
  rangeObj.setEnd(endNode, endResult.offset || 0)

  return {
    node: rangeObj,
    isRange: true
  }
}

/**
 * Resolves a CFI path to a DOM node
 * @param path The CFI path to resolve
 * @param document The document to resolve against
 * @param options Options for resolving
 * @returns The resolved node
 */
function resolvePath(
  path: ParsedCfiPart,
  document: Document,
  options: ResolveOptions,
): ResolveResult {
  const { throwOnError = false } = options

  // Ensure we have a valid document
  if (!document) {
    if (throwOnError) {
      throw new Error("Document is null or undefined")
    }
    // Create a fallback document if needed
    const fallbackDoc = new Document();
    return { node: fallbackDoc, isRange: false }
  }

  // Start at the document
  let currentNode: Node | null = document
  let offset: number | undefined
  let temporal: number | undefined
  let spatial: [number, number] | undefined
  let side: "a" | "b" | undefined

  // Traverse the path
  for (const part of path) {
    // Handle character offset
    if (part.offset !== undefined) {
      offset = part.offset
      continue
    }

    // Handle temporal offset
    if (part.temporal !== undefined) {
      temporal = part.temporal
      continue
    }

    // Handle spatial offset
    if (part.spatial !== undefined) {
      spatial = part.spatial
      continue
    }

    // Handle side bias
    if (part.side !== undefined) {
      side = part.side
      continue
    }

    // Handle text assertion
    if (part.text !== undefined) {
      // Find the text node that contains the text
      if (!currentNode) {
        if (throwOnError) {
          throw new Error("Cannot find text node: currentNode is null")
        }
        return { node: document, isRange: false }
      }
      
      const textNodes: Node[] = Array.from(currentNode.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      )

      for (const textNode of textNodes) {
        if (textNode.textContent?.includes(part.text[0])) {
          currentNode = textNode
          break
        }
      }

      continue
    }

    // Handle element ID
    if (part.id !== undefined) {
      if (!currentNode) {
        if (throwOnError) {
          throw new Error("Cannot find element by ID: currentNode is null")
        }
        return { node: document, isRange: false }
      }
      
      const element = document.getElementById(part.id)
      if (!element) {
        if (throwOnError) {
          throw new Error(`Element with ID "${part.id}" not found`)
        }
        return { node: document, isRange: false }
      }
      currentNode = element
      continue
    }

    // Handle index
    if (part.index !== undefined) {
      if (!currentNode) {
        if (throwOnError) {
          throw new Error("Cannot access child nodes: currentNode is null")
        }
        return { node: document, isRange: false }
      }
      
      const childNodes = Array.from(currentNode.childNodes)
      if (part.index >= childNodes.length) {
        if (throwOnError) {
          throw new Error(`Index ${part.index} out of bounds`)
        }
        return { node: document, isRange: false }
      }
      
      const childNode = childNodes[part.index]
      if (!childNode) {
        if (throwOnError) {
          throw new Error(`Child node at index ${part.index} is null`)
        }
        return { node: document, isRange: false }
      }
      
      currentNode = childNode
    }
  }

  if (!currentNode) {
    if (throwOnError) {
      throw new Error("Failed to resolve path: currentNode is null")
    }
    return { node: document, isRange: false }
  }

  return {
    node: currentNode,
    isRange: false,
    offset,
    temporal,
    spatial,
    side,
  }
}
