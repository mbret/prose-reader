import type { AppleMetadata } from "./metadata/apple/parse.ts"
import { resolveApple } from "./metadata/apple/resolve.ts"
import type { ComicInfo } from "./metadata/comicInfo/parse.ts"
import { resolveComicInfo } from "./metadata/comicInfo/resolve.ts"
import type { KoboMetadata } from "./metadata/kobo/parse.ts"
import { resolveKobo } from "./metadata/kobo/resolve.ts"
import type { OpfMetadata } from "./metadata/opf/parse.ts"
import { resolveOpf } from "./metadata/opf/resolve.ts"
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
 * - Descriptive fields (`titles`, `description`, `publication`,
 *   `languages`, `subjects`, `contributors`, `belongsTo`):
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
 * - Format-scoped corners (`comicInfo`, `apple`, `kobo`) and single-source
 *   fields (`rights`, `properties`, `numberOfPages`…) come from
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
  const edition = omitUndefined({
    date:
      opf?.publication?.edition?.date ?? comicInfo?.publication?.edition?.date,
    publisher:
      opf?.publication?.edition?.publisher ??
      comicInfo?.publication?.edition?.publisher,
    imprint:
      opf?.publication?.edition?.imprint ??
      comicInfo?.publication?.edition?.imprint,
  })

  return omitUndefined({
    titles: opf?.titles ?? comicInfo?.titles,
    description: opf?.description ?? comicInfo?.description,
    publication:
      edition.date !== undefined ||
      edition.publisher !== undefined ||
      edition.imprint !== undefined
        ? { edition }
        : undefined,
    rights: opf?.rights,
    languages: opf?.languages ?? comicInfo?.languages,
    subjects: opf?.subjects ?? comicInfo?.subjects,
    contributors: opf?.contributors ?? comicInfo?.contributors,
    readingDirection: comicInfo?.readingDirection ?? opf?.readingDirection,
    renditionLayout:
      opf?.renditionLayout ?? apple?.renditionLayout ?? kobo?.renditionLayout,
    renditionFlow: opf?.renditionFlow,
    renditionSpread: opf?.renditionSpread,
    numberOfPages: comicInfo?.numberOfPages,
    identifiers: identifiers.length > 0 ? identifiers : undefined,
    belongsTo: opf?.belongsTo ?? comicInfo?.belongsTo,
    properties: opf?.properties,
    comicInfo: comicInfo?.comicInfo,
    apple: apple?.apple,
    kobo: kobo?.kobo,
  })
}
