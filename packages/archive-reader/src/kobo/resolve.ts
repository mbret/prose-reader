import type { ArchiveResolveResult } from "../types/archiveResolve"
import type { KoboMetadata } from "./parse"

export const resolveKobo = (input: KoboMetadata): ArchiveResolveResult => ({
  gtin: undefined,
  isbn: undefined,
  readingDirection: undefined,
  renditionLayout: input.renditionLayout,
  title: undefined,
  authors: undefined,
  publisher: undefined,
  rights: undefined,
  languages: undefined,
  date: undefined,
  subjects: undefined,
})
