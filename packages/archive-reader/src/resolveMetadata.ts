import type { AppleMetadata } from "./apple/parse.ts"
import { resolveApple } from "./apple/resolve.ts"
import type { ComicInfo } from "./comicInfo/parse.ts"
import { resolveComicInfo } from "./comicInfo/resolve.ts"
import type { KoboMetadata } from "./kobo/parse.ts"
import { resolveKobo } from "./kobo/resolve.ts"
import type { OpfMetadata } from "./opf/parse.ts"
import { resolveOpf } from "./opf/resolve.ts"
import type { ResolvedMetadata } from "./types/resolvedMetadata.ts"
import { omitUndefined } from "./utils/omitUndefined.ts"

export type ResolveMetadataSources = {
  opf?: OpfMetadata
  comicInfo?: ComicInfo
  apple?: AppleMetadata
  kobo?: KoboMetadata
}

/**
 * Merges the per-source resolved metadata of every parsed source into one
 * {@link ResolvedMetadata}, with explicit precedence:
 *
 * - Descriptive fields (`title`, `description`, `publisher`, `languages`,
 *   `subjects`, `contributors`, `published`, `belongsTo`, `gtin`/`isbn`):
 *   **OPF wins over ComicInfo** — the package document is the publication's
 *   own metadata; a ComicInfo sidecar fills the gaps.
 * - `readingDirection`: **ComicInfo wins over OPF** (`Manga` beats
 *   `page-progression-direction`). Deliberate: this preserves the behavior
 *   the streamer has always had, and for actual comic archives there is no
 *   OPF anyway — see the merge tests for the recorded decision.
 * - `renditionLayout`: **OPF explicit → Apple → Kobo**, first defined wins.
 *   Kobo ranks last on purpose: in the manifest pipeline it historically
 *   ran after the viewport-promotion optimizer, and since promotion only
 *   ever rewrites an already-defined layout, "after promotion" and "after
 *   OPF/Apple" are equivalent ranks.
 * - `identifiers` concatenates (OPF first) — different identifier systems
 *   coexist rather than compete.
 * - Format-scoped corners (`comic`, `apple`, `kobo`) and single-source
 *   fields (`rights`, `properties`, `imprint`, `numberOfPages`…) come from
 *   their only producer.
 */
export const resolveMetadata = (
  sources: ResolveMetadataSources,
): ResolvedMetadata => {
  const opf = sources.opf !== undefined ? resolveOpf(sources.opf) : undefined
  const comicInfo =
    sources.comicInfo !== undefined
      ? resolveComicInfo(sources.comicInfo)
      : undefined
  const apple =
    sources.apple !== undefined ? resolveApple(sources.apple) : undefined
  const kobo =
    sources.kobo !== undefined ? resolveKobo(sources.kobo) : undefined

  const identifiers = [
    ...(opf?.identifiers ?? []),
    ...(comicInfo?.identifiers ?? []),
  ]

  return omitUndefined({
    title: opf?.title ?? comicInfo?.title,
    description: opf?.description ?? comicInfo?.description,
    publisher: opf?.publisher ?? comicInfo?.publisher,
    imprint: comicInfo?.imprint,
    rights: opf?.rights,
    languages: opf?.languages ?? comicInfo?.languages,
    subjects: opf?.subjects ?? comicInfo?.subjects,
    contributors: opf?.contributors ?? comicInfo?.contributors,
    published: opf?.published ?? comicInfo?.published,
    readingDirection: comicInfo?.readingDirection ?? opf?.readingDirection,
    renditionLayout:
      opf?.renditionLayout ?? apple?.renditionLayout ?? kobo?.renditionLayout,
    renditionFlow: opf?.renditionFlow,
    renditionSpread: opf?.renditionSpread,
    numberOfPages: comicInfo?.numberOfPages,
    gtin: opf?.gtin ?? comicInfo?.gtin,
    isbn: opf?.isbn ?? comicInfo?.isbn,
    identifiers: identifiers.length > 0 ? identifiers : undefined,
    belongsTo: opf?.belongsTo ?? comicInfo?.belongsTo,
    properties: opf?.properties,
    comic: comicInfo?.comic,
    apple: apple?.apple,
    kobo: kobo?.kobo,
  })
}
