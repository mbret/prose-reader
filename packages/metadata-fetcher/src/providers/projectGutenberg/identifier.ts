import type {
  FetchMetadataInput,
  MetadataIdentifier,
} from "../../types/fetchMetadataInput.ts"

export const PROJECT_GUTENBERG_IDENTIFIER_SCHEME = "ProjectGutenberg"

export type ProjectGutenbergLookup = {
  readonly id: string
  /** The book's exact identifier spelling, echoed only after PG confirms it. */
  readonly identifier: MetadataIdentifier
}

const GUTENBERG_HOSTS: ReadonlySet<string> = new Set([
  "gutenberg.org",
  "www.gutenberg.org",
])

const GUTENBERG_PATHS: ReadonlyArray<RegExp> = [
  /^\/ebooks\/(\d+)(?:[./]|$)/i,
  /^\/files\/(\d+)(?:\/|$)/i,
  /^\/cache\/epub\/(\d+)(?:\/|$)/i,
  /^\/(\d+)(?:\/|$)/,
]

const normalizedProjectGutenbergId = (value: string): string | undefined => {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) return undefined

  const normalized = trimmed.replace(/^0+(?=\d)/, "")

  return normalized !== "0" ? normalized : undefined
}

const projectGutenbergIdFromUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value.trim())

    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    if (!GUTENBERG_HOSTS.has(url.hostname.toLowerCase())) return undefined

    for (const pattern of GUTENBERG_PATHS) {
      const id = pattern.exec(url.pathname)?.[1]

      if (id !== undefined) return normalizedProjectGutenbergId(id)
    }
  } catch {
    return undefined
  }

  return undefined
}

/**
 * Recognizes Project Gutenberg's own numeric identifier and official URL
 * forms. Calling providers decide explicitly how to use this crosswalk; the
 * shared scorer never reinterprets arbitrary URLs.
 */
export const projectGutenbergLookupFromInput = (
  input: FetchMetadataInput,
): ProjectGutenbergLookup | undefined => {
  for (const identifier of input.identifiers ?? []) {
    const scheme = identifier.scheme?.trim().toLowerCase()
    const id =
      scheme === PROJECT_GUTENBERG_IDENTIFIER_SCHEME.toLowerCase()
        ? normalizedProjectGutenbergId(identifier.value)
        : scheme === undefined || scheme === "url" || scheme === "uri"
          ? projectGutenbergIdFromUrl(identifier.value)
          : undefined

    if (id === undefined) continue

    return {
      id,
      identifier: {
        value: identifier.value,
        ...(identifier.scheme !== undefined
          ? { scheme: identifier.scheme }
          : {}),
      },
    }
  }

  return undefined
}
