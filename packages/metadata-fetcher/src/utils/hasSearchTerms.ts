import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { metadataAuthors } from "./metadataAuthors.ts"

/**
 * Whether a catalog has anything to go on. Descriptive fields alone (a
 * publisher, a language, a page count) narrow a search but cannot start one,
 * so they don't count: what identifies or names the book does.
 *
 * The cheap guard before spending a network round trip on a book whose
 * container told us nothing:
 *
 * ```ts
 * if (!hasSearchTerms(resolved.metadata)) return // nothing to ask about
 * ```
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
