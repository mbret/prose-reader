import type { ArchiveResolveResult } from "../types/archiveResolve"
import { normalizeGtin } from "../utils/normalizeGtin"
import { normalizeIsbn } from "../utils/normalizeIsbn"
import type { OpfIdentifier, OpfMetadata } from "./parse"

const rawIdentifierValueForIsbn = (
  identifiers: ReadonlyArray<OpfIdentifier>,
): string | undefined => {
  if (identifiers.length === 0) return undefined

  const withIsbnScheme = identifiers.find(
    (i) => i.scheme !== undefined && i.scheme.trim().toLowerCase() === "isbn",
  )
  if (withIsbnScheme !== undefined) return withIsbnScheme.value

  for (const i of identifiers) {
    if (normalizeIsbn(i.value) !== undefined) return i.value
  }

  return undefined
}

export const resolveOpf = (input: OpfMetadata): ArchiveResolveResult => {
  const ppd = input.pageProgressionDirection?.trim().toLowerCase()
  const readingDirection = ppd === "ltr" || ppd === "rtl" ? ppd : undefined

  const rl = input.renditionLayoutMeta?.trim().toLowerCase()
  const renditionLayout =
    rl === "reflowable" || rl === "pre-paginated" ? rl : undefined

  const raw = rawIdentifierValueForIsbn(input.identifiers)
  const isbn = normalizeIsbn(raw)
  const gtin = normalizeGtin(raw)

  return {
    ...(gtin !== undefined ? { gtin } : {}),
    ...(isbn !== undefined ? { isbn } : {}),
    ...(readingDirection !== undefined ? { readingDirection } : {}),
    ...(renditionLayout !== undefined ? { renditionLayout } : {}),
  }
}
