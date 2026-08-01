import type { ResolvedMetadata } from "@prose-reader/archive-reader"

/**
 * The names to match a publication on: those credited as `author`, else — for
 * a publication crediting nobody as one, like a comic archive listing only a
 * penciler — every contributor. Order is preserved (sources list the lead
 * creator first) and duplicates are dropped.
 */
export const metadataAuthors = (
  metadata: ResolvedMetadata,
): ReadonlyArray<string> => {
  const contributors = metadata.contributors ?? []
  const authors = contributors.filter((contributor) =>
    contributor.roles.includes("author"),
  )
  const names = (authors.length > 0 ? authors : contributors)
    .map((contributor) => contributor.name.trim())
    .filter((name) => name.length > 0)

  return [...new Set(names)]
}
