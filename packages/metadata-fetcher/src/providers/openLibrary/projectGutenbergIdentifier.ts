import type { ResolvedMetadata } from "@prose-reader/archive-reader"

export type OpenLibraryProjectGutenbergLookup = {
  readonly id: string
  /** The book's exact identifier spelling, echoed only after OL confirms it. */
  readonly identifier: {
    readonly value: string
    readonly scheme?: string
  }
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

const projectGutenbergIdFromUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value.trim())

    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    if (!GUTENBERG_HOSTS.has(url.hostname.toLowerCase())) return undefined

    for (const pattern of GUTENBERG_PATHS) {
      const id = pattern.exec(url.pathname)?.[1]

      if (id !== undefined) return id
    }
  } catch {
    return undefined
  }

  return undefined
}

/**
 * Open Library-specific crosswalk: its `id_project_gutenberg` search field
 * stores the numeric id encoded by official Gutenberg URLs. Other providers
 * own their own identifier conventions; this is intentionally not generic.
 */
export const projectGutenbergLookupFromMetadata = (
  metadata: ResolvedMetadata,
): OpenLibraryProjectGutenbergLookup | undefined => {
  for (const identifier of metadata.identifiers ?? []) {
    const scheme = identifier.scheme?.trim().toLowerCase()

    if (scheme !== undefined && scheme !== "url" && scheme !== "uri") continue

    const id = projectGutenbergIdFromUrl(identifier.value)

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
