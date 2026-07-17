import type { ArchiveResolveResult } from "../types/archiveResolve"
import { normalizeGtin } from "../utils/normalizeGtin"
import { normalizeIsbn } from "../utils/normalizeIsbn"
import { parseW3cDtfDate } from "../utils/parseW3cDtfDate"
import type { OpfIdentifier, OpfMetadata } from "./parse"

const rawIdentifierValueForIsbn = (
  identifiers: ReadonlyArray<OpfIdentifier>,
): string | undefined => {
  for (const i of identifiers) {
    if (i.scheme !== undefined && i.scheme.trim().toLowerCase() === "isbn") {
      if (normalizeIsbn(i.value) !== undefined) return i.value
    }
  }

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

  return {
    gtin: normalizeGtin(raw),
    isbn: normalizeIsbn(raw),
    readingDirection,
    renditionLayout,
    title: input.title,
    authors: input.creators.length > 0 ? [...input.creators] : undefined,
    publisher: input.publisher,
    rights: input.rights,
    languages: input.languages.length > 0 ? [...input.languages] : undefined,
    date: parseW3cDtfDate(input.date),
    subjects: input.subjects.length > 0 ? [...input.subjects] : undefined,
  }
}
