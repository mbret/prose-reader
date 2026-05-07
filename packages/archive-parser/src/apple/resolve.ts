import type { ArchiveResolveResult } from "../types/archiveResolve"
import type { AppleMetadata } from "./parse"

export const resolveApple = (input: AppleMetadata): ArchiveResolveResult => {
  const fixedLayout = input.displayOptions?.platform?.options?.find(
    (o) => o.name === "fixed-layout",
  )?.value

  const renditionLayout =
    fixedLayout?.trim().toLowerCase() === "true" ? "pre-paginated" : undefined

  return {
    gtin: undefined,
    isbn: undefined,
    readingDirection: undefined,
    renditionLayout,
    title: undefined,
    authors: undefined,
    publisher: undefined,
    rights: undefined,
    languages: undefined,
    date: undefined,
    subjects: undefined,
  }
}
