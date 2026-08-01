import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { metadataAuthors } from "./metadataAuthors.ts"

/**
 * Whether a catalog has anything to go on, so a lookup with nothing to ask
 * about costs no round trip. Descriptive fields alone — a publisher, a
 * language, a page count — narrow a search but cannot start one.
 */
export const hasSearchTerms = (metadata: ResolvedMetadata): boolean =>
  [
    metadata.title,
    metadata.isbn,
    metadata.gtin,
    metadata.belongsTo?.series?.[0]?.name,
  ].some((value) => value !== undefined && value.trim().length > 0) ||
  (metadata.identifiers ?? []).length > 0 ||
  metadataAuthors(metadata).length > 0
