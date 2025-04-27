/**
 * EPUB Canonical Fragment Identifier (CFI) utilities
 * Based on the EPUB CFI 1.1 specification: https://idpf.org/epub/linking/cfi/epub-cfi.html
 */

import { cfiEscape, isCFI, wrapCfi } from "./utils"

/**
 * Interface for a parsed CFI part
 */
export interface CfiPart {
  index: number
  id?: string
  offset?: number
  temporal?: number
  spatial?: number[]
  text?: string[]
  side?: string
  extensions?: Record<string, string>
}

/**
 * Interface for a parsed CFI range
 */
export interface CfiRange {
  parent: CfiPart[][]
  start: CfiPart[][]
  end: CfiPart[][]
}

/**
 * Interface for a parsed CFI
 */
export type ParsedCfi = CfiPart[][] | CfiRange

/**
 * Unwrap a CFI string from the epubcfi() function
 * @param cfi The CFI string to unwrap
 * @returns The unwrapped CFI string
 */
export function unwrapCfi(cfi: string): string {
  const match = cfi.match(isCFI)
  return match ? match[1] || cfi : cfi
}

/**
 * Token type for CFI parsing
 */
type CfiToken = [string, string | number]

/**
 * Tokenize a CFI string into an array of tokens
 * @param cfi The CFI string to tokenize
 * @returns An array of tokens
 */
function tokenize(cfi: string): CfiToken[] {
  const tokens: CfiToken[] = []
  let state: string | null = null
  let isEscaped = false
  let value = ""

  const push = (token: CfiToken) => {
    tokens.push(token)
    state = null
    value = ""
  }

  const cat = (c: string) => {
    value += c
    isEscaped = false
  }

  const unwrappedCfi = unwrapCfi(cfi).trim()
  const chars = Array.from(unwrappedCfi).concat("")

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]

    if (!char) {
      // End of string, push any pending token
      if (state === "/" || state === ":") {
        push([state, parseInt(value, 10)])
      } else if (state === "~") {
        push(["~", parseFloat(value)])
      } else if (state === "@") {
        push(["@", parseFloat(value)])
      } else if (state === "[") {
        push(["[", value])
      } else if (state === ";" || state?.startsWith(";")) {
        push([state, value])
      }
      break
    }

    // Handle escape characters
    if (char === "^" && !isEscaped) {
      isEscaped = true
      continue
    }

    if (state === "!") {
      push(["!", 0])
    } else if (state === ",") {
      push([",", 0])
    } else if (state === "/" || state === ":") {
      if (/^\d$/.test(char)) {
        cat(char)
        continue
      }
      push([state, parseInt(value, 10)])
    } else if (state === "~") {
      if (/^\d$/.test(char) || char === ".") {
        cat(char)
        continue
      }
      push(["~", parseFloat(value)])
    } else if (state === "@") {
      if (char === ":") {
        push(["@", parseFloat(value)])
        state = "@"
        continue
      }
      if (/^\d$/.test(char) || char === ".") {
        cat(char)
        continue
      }
      push(["@", parseFloat(value)])
    } else if (state === "[") {
      if (char === ";" && !isEscaped) {
        push(["[", value])
        state = ";"
      } else if (char === "," && !isEscaped) {
        push(["[", value])
        state = "["
      } else if (char === "]" && !isEscaped) {
        push(["[", value])
      } else {
        cat(char)
        continue
      }
    } else if (state === ";") {
      // Handle extension parameter key
      if (char === "=" && !isEscaped) {
        state = `;${value}`
        value = ""
      } else if (char === ";" && !isEscaped) {
        push([state, value])
        state = ";"
      } else if (char === "]" && !isEscaped) {
        push([state, value])
      } else {
        cat(char)
        continue
      }
    } else if (state?.startsWith(";")) {
      // Handle extension parameter value
      if (char === ";" && !isEscaped) {
        push([state, value])
        state = ";"
      } else if (char === "]" && !isEscaped) {
        push([state, value])
      } else {
        cat(char)
        continue
      }
    } else if (state === null && char === ";") {
      // Handle standalone extension parameters (not inside brackets)
      state = ";"
    }

    if (
      char === "/" ||
      char === ":" ||
      char === "~" ||
      char === "@" ||
      char === "[" ||
      char === "!" ||
      char === ","
    ) {
      state = char
    }
  }

  return tokens
}

/**
 * Find indices of tokens with a specific type
 * @param tokens The tokens to search
 * @param type The type to find
 * @returns An array of indices
 */
function findTokenIndices(
  tokens: CfiToken[] | undefined,
  type: string,
): number[] {
  if (!tokens) {
    return []
  }

  return tokens
    .map((token, i) => (token[0] === type ? i : null))
    .filter((i): i is number => i !== null)
}

/**
 * Split an array at specific indices
 * @param arr The array to split
 * @param indices The indices to split at
 * @returns An array of arrays
 */
function splitAt<T>(arr: T[], indices: number[]): T[][] {
  const result: T[][] = []
  let start = 0

  for (const index of indices) {
    result.push(arr.slice(start, index))
    start = index
  }

  result.push(arr.slice(start))
  return result
}

/**
 * Parse a single part of a CFI
 * @param tokens The tokens to parse
 * @returns An array of CFI parts
 */
function parsePart(tokens: CfiToken[]): CfiPart[] {
  const parts: CfiPart[] = []

  // Group tokens by path step
  const pathStepTokens: { [key: number]: CfiToken[] } = {}
  let currentPathStep = -1

  // First pass: group tokens by path step
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue

    const [type, val] = token

    if (type === "/") {
      currentPathStep++
      parts[currentPathStep] = { index: val as number }
      pathStepTokens[currentPathStep] = []
    } else if (currentPathStep >= 0) {
      pathStepTokens[currentPathStep]?.push(token)
    }
  }

  // Second pass: process tokens for each path step
  for (let stepIndex = 0; stepIndex < parts.length; stepIndex++) {
    const currentPart = parts[stepIndex]
    if (!currentPart) continue

    const stepsTokens = pathStepTokens[stepIndex] || []

    for (let i = 0; i < stepsTokens.length; i++) {
      const token = stepsTokens[i]
      if (!token) continue

      const [type, val] = token

      if (type === ":") {
        currentPart.offset = val as number
      } else if (type === "~") {
        currentPart.temporal = val as number
      } else if (type === "@") {
        currentPart.spatial = (currentPart.spatial || []).concat(val as number)
      } else if (type === ";s") {
        currentPart.side = val as string
      } else if (type.startsWith(";") && type !== ";s") {
        // This is an extension parameter
        const paramName = type.substring(1)
        if (!currentPart.extensions) {
          currentPart.extensions = {}
        }
        currentPart.extensions[paramName] = val as string
      } else if (type === "[") {
        // Determine if this is an ID or text assertion
        const looksLikeId =
          typeof val === "string" && !val.includes(" ") && val.length < 50

        if (i === 0 && looksLikeId && !currentPart.id) {
          currentPart.id = val as string
        } else {
          // Otherwise, it's a text assertion
          if (val !== "") {
            currentPart.text = (currentPart.text || []).concat(val as string)
          }
        }
      }
    }
  }

  return parts
}

/**
 * Parse a CFI with indirections
 * @param tokens The tokens to parse
 * @returns An array of arrays of CFI parts
 */
function parseIndirection(tokens: CfiToken[]): CfiPart[][] {
  const indirectionIndices = findTokenIndices(tokens, "!")
  return splitAt(tokens, indirectionIndices).map(parsePart)
}

/**
 * Parse a CFI string into a structured representation
 * @param cfi The CFI string to parse
 * @returns A parsed CFI
 */
export function parse(cfi: string): ParsedCfi {
  if (!cfi) {
    throw new Error("CFI string cannot be empty")
  }

  const tokens = tokenize(cfi)
  if (!tokens || tokens.length === 0) {
    throw new Error("Failed to tokenize CFI string")
  }

  const commaIndices = findTokenIndices(tokens, ",")

  if (commaIndices.length === 0) {
    return parseIndirection(tokens)
  }

  const [parentTokens, startTokens, endTokens] = splitAt(tokens, commaIndices)

  return {
    parent: parseIndirection(parentTokens || []),
    start: parseIndirection(startTokens || []),
    end: parseIndirection(endTokens || []),
  }
}

/**
 * Convert a CFI part to a string
 * @param part The CFI part to convert
 * @returns A string representation of the CFI part
 */
function partToString(part: CfiPart): string {
  // Prepare extension parameters
  const extensionParams: string[] = []

  if (part.side) {
    extensionParams.push(`s=${part.side}`)
  }

  if (part.extensions) {
    for (const [key, value] of Object.entries(part.extensions)) {
      extensionParams.push(`${key}=${cfiEscape(value)}`)
    }
  }

  // Format expected in the tests:
  // /4[body01]/10[para05];vnd.test.param1=value1;vnd.test.param2=value2

  let result = `/${part.index}`

  // Add ID assertion if present
  if (part.id) {
    result += `[${cfiEscape(part.id)}]`
  }

  // Add offset if applicable
  if (part.offset !== undefined && part.index % 2 === 1) {
    result += `:${part.offset}`
  }

  // Add temporal offset if present
  if (part.temporal !== undefined) {
    result += `~${part.temporal}`
  }

  // Add spatial offset if present
  if (part.spatial) {
    result += `@${part.spatial.join(":")}`
  }

  // Add text assertion if present
  if (part.text && part.text.length > 0) {
    result += `[${part.text.map(cfiEscape).join(",")}]`
  }

  // Add extension parameters outside of brackets, directly to the path
  if (extensionParams.length > 0) {
    result += `;${extensionParams.join(";")}`
  }

  return result
}

/**
 * Convert a parsed CFI to a string
 * @param parsed The parsed CFI to convert
 * @returns A string representation of the CFI
 */
export function parsedCfiToString(parsed: ParsedCfi): string {
  if ("parent" in parsed) {
    // It's a range
    const parent = parsed.parent
      .map((parts) => parts.map(partToString).join(""))
      .join("!")
    const start = parsed.start
      .map((parts) => parts.map(partToString).join(""))
      .join("!")
    const end = parsed.end
      .map((parts) => parts.map(partToString).join(""))
      .join("!")

    return wrapCfi(`${parent},${start},${end}`)
  }

  // It's a single CFI
  return wrapCfi(
    parsed.map((parts) => parts.map(partToString).join("")).join("!"),
  )
}
