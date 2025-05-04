import type { CfiPart, ParsedCfi } from "./parse"

function escapeChar(char: string): string {
  if (
    char === "[" ||
    char === "]" ||
    char === "(" ||
    char === ")" ||
    char === ";" ||
    char === "=" ||
    char === ","
  ) {
    return `^${char}`
  }
  return char
}

function escapeString(str: string): string {
  return str.split("").map(escapeChar).join("")
}

/**
 * Serialize a single CFI part into a string
 * @param part The CFI part to serialize
 * @returns The serialized string representation
 */
function serializePart(part: CfiPart): string {
  let result = `/${part.index}`

  // Handle ID assertion first if present
  if (part.id) {
    result += `[${escapeString(part.id)}`
    // Add extensions inside ID brackets if present
    if (part.extensions) {
      for (const [key, value] of Object.entries(part.extensions)) {
        result += `;${key}=${escapeString(value)}`
      }
    }
    result += `]`
  }

  // Handle character offset
  if (part.offset !== undefined) {
    result += `:${part.offset}`
  }

  // Handle temporal offset
  if (part.temporal !== undefined) {
    result += `~${part.temporal}`
  }

  // Handle spatial offset
  if (part.spatial && part.spatial.length > 0) {
    result += `@${part.spatial.join(":")}`
  }

  // Handle text assertions and side bias in brackets
  const inBrackets: string[] = []

  // Handle text assertions
  console.log(part.text)
  if (part.text && part.text.length > 0) {
    inBrackets.push(part.text.map(escapeString).join(","))
  }

  // Handle side bias and extensions in brackets
  if (part.side || (part.extensions && !part.id)) {
    if (part.side) {
      inBrackets.push(`;s=${part.side}`)
    }
    if (part.extensions && !part.id) {
      for (const [key, value] of Object.entries(part.extensions)) {
        inBrackets.push(`;${key}=${escapeString(value)}`)
      }
    }
  }

  // Add bracketed attributes if any
  if (inBrackets.length > 0) {
    result += `[${inBrackets.join("")}]`
  }

  return result
}

/**
 * Serialize a single CFI path into a string
 * @param path The CFI path to serialize
 * @returns The serialized string representation
 */
function serializePath(path: CfiPart[]): string {
  return path.map((part) => serializePart(part)).join("")
}

/**
 * Serialize a parsed CFI into a string
 * @param parsed The parsed CFI to serialize
 * @returns The serialized CFI string
 */
export function serialize(parsed: ParsedCfi): string {
  if (Array.isArray(parsed)) {
    // Handle simple CFI or CFI with indirections
    return `epubcfi(${parsed.map(serializePath).join("!")})`
  }

  // Handle CFI range
  const parent = parsed.parent.map(serializePath).join("!")
  const start = parsed.start.map(serializePath).join("!")
  const end = parsed.end.map(serializePath).join("!")
  return `epubcfi(${parent},${start},${end})`
}
