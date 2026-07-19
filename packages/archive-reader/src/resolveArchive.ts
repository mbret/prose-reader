import type { AppleMetadata } from "./apple/parse"
import { readArchiveApple } from "./apple/readArchiveApple"
import type { Archive } from "./archives/types"
import type { ComicInfo } from "./comicInfo/parse"
import { readArchiveComicInfo } from "./comicInfo/readArchiveComicInfo"
import { resolveArchiveCover } from "./cover/resolveArchiveCover"
import type { KoboMetadata } from "./kobo/parse"
import { readArchiveKobo } from "./kobo/readArchiveKobo"
import { readingOrderDocumentsAllHaveViewport } from "./layout/scanReadingOrderDocumentsViewport"
import type { ArchiveOpfParsed } from "./opf/readArchiveOpf"
import { readArchiveOpf } from "./opf/readArchiveOpf"
import type { ArchiveReadingOrderItem } from "./readingOrder/resolveArchiveReadingOrder"
import { resolveArchiveReadingOrder } from "./readingOrder/resolveArchiveReadingOrder"
import { Report } from "./report"
import { resolveMetadata } from "./resolveMetadata"
import { resolveArchiveToc } from "./toc/resolveArchiveToc"
import type { ArchiveTocItem } from "./toc/types"
import type { ResolvedMetadata } from "./types/resolvedMetadata"
import { omitUndefined } from "./utils/omitUndefined"

/**
 * Verbatim parser outputs, keyed by source — provenance for the normalized
 * `metadata` and the escape hatch for single-format consumers. Everything in
 * here is also represented, normalized, in `metadata` (the mapping tables
 * next to each resolver enforce it); duplication between the two is the
 * contract, not a smell: `metadata` says what the resolver believes, sources
 * say what the book said, so a wrong mapping opinion is revisable in a
 * release without the raw value ever having left the entity.
 */
export type ResolvedArchiveSources = {
  readonly opf?: ArchiveOpfParsed
  readonly comicInfo?: ComicInfo
  readonly apple?: AppleMetadata
  readonly kobo?: KoboMetadata
}

/**
 * The fully resolved, plain-JSON view of a book container: everything a
 * reading or library app needs to present the publication, with no archive
 * handle attached — structured-clone-able, persistable, cacheable.
 *
 * Everything is container-relative (reading order `uri`s, toc
 * `containerHref`s): the entity carries no serving concern, consumers rebase
 * into their own space (the prose streamer does exactly that to produce its
 * `Manifest`).
 */
export type ResolvedArchive = {
  /**
   * Schema version of this entity, for consumers persisting it. Bumped only
   * when the shape or meaning of existing fields changes incompatibly;
   * additive growth (new optional fields, vocabulary extensions) does not
   * bump it.
   */
  readonly version: number
  /**
   * Cross-format normalized metadata (see {@link ResolvedMetadata}),
   * including the resolved `cover` — metadata is resolved for the whole
   * container, not just its descriptive sidecars.
   */
  readonly metadata: ResolvedMetadata
  readonly readingOrder: ArchiveReadingOrderItem[]
  /**
   * Absent when no toc is derivable (a flat, package-less container). An
   * EPUB without a nav document or NCX resolves to an explicit empty list —
   * the folder layout of an EPUB zip is not a meaningful toc.
   */
  readonly toc?: ArchiveTocItem[]
  readonly sources: ResolvedArchiveSources
}

/**
 * Projection tokens are simply the keys of the result. Cost classes:
 *
 * - `metadata`, `sources`: sidecar XML reads (OPF, ComicInfo.xml,
 *   Apple/Kobo display options) — cheap. `metadata` also derives the cover:
 *   free for an OPF cover, and for a package-less container it computes the
 *   reading-order listing (an in-memory records scan) for the first-page
 *   fallback.
 * - `readingOrder`: the OPF read at most — cheap.
 * - `toc`: one nav or NCX document read+parse on top — medium.
 * - `version`: free, and always present regardless of projection.
 *
 * The default (`metadata`, `readingOrder`, `toc`) costs O(sidecar files) +
 * one navigation document: anything that reads the whole book is opt-in
 * (see `layoutScan`). `sources` is opt-in too — it rides for free on the
 * reads its neighbors already do.
 */
export type ResolveArchiveToken = keyof ResolvedArchive

const DEFAULT_INCLUDE = ["metadata", "readingOrder", "toc"] as const

export type ResolveArchiveOptions<
  T extends ReadonlyArray<ResolveArchiveToken>,
> = {
  /**
   * Projection: which parts of {@link ResolvedArchive} to resolve and
   * return. Defaults to `["metadata", "readingOrder", "toc"]`. `sources` is
   * deliberately not in the default set — it roughly doubles the persisted
   * entity for provenance most consumers don't need; requesting it is free
   * when it rides along tokens that parse the sidecars anyway.
   */
  include?: T
  /**
   * Effort modifier, not a projection token: reads and XML-parses **every**
   * reading-order document (O(book)) to apply the industry viewport
   * heuristic — an explicitly-reflowable publication whose spine documents
   * all declare `head > meta[name=viewport]` is promoted to `pre-paginated`
   * (metadata and per-item). The refinement is merged into the result here,
   * inside the resolver; consumers never re-implement the merge. Defaults
   * to false, honoring the "nothing reads the whole book by default" rule.
   */
  layoutScan?: boolean
}

const safeRead = async <T>(
  read: () => Promise<T>,
  source: string,
): Promise<T | undefined> => {
  try {
    return await read()
  } catch (e) {
    // books in the wild are dirty: a malformed source never fails the
    // resolve, it just doesn't contribute
    Report.error(`resolveArchive: unable to read ${source}`, e)

    return undefined
  }
}

/**
 * The counted page count: one page per pre-paginated reading-order item
 * (comics, image archives, fixed layout). Reflowable documents are not
 * pre-paginated, so a reflowable publication counts zero here and its page
 * count stays absent — a document count is not a page count.
 */
const countPrePaginatedPages = (
  readingOrder: ArchiveReadingOrderItem[],
): number | undefined => {
  const count = readingOrder.filter(
    (item) => item.renditionLayout === "pre-paginated",
  ).length

  return count > 0 ? count : undefined
}

const RESOLVED_ARCHIVE_VERSION = 1

/**
 * Resolves a book container into a single enriched, plain-JSON entity:
 * normalized cross-format {@link ResolvedMetadata}, the container-relative
 * reading order and toc, and optionally the verbatim per-source outputs.
 *
 * This is the flagship entry point of the package — parsers and per-source
 * readers stay exported as the advanced layer underneath.
 *
 * ```ts
 * const { metadata, readingOrder, toc } = await resolveArchive(archive)
 *
 * // library-shelf scan: metadata (incl. cover) only, skip the toc read
 * const { metadata } = await resolveArchive(archive, { include: ["metadata"] })
 * renderShelfItem({ title: metadata.title, cover: metadata.cover?.uri })
 *
 * // your own per-source precedence via the raw sources escape hatch
 * // (resolveArchiveMetadata normalizes a single source at a time)
 * const { sources } = await resolveArchive(archive, { include: ["sources"] })
 * const opf = sources.opf && resolveArchiveMetadata(sources.opf.opf)
 * const comicInfo = sources.comicInfo && resolveArchiveMetadata(sources.comicInfo)
 * const isbn = comicInfo?.isbn ?? opf?.isbn // ComicInfo wins, your call
 *
 * // full fidelity, including the O(book) layout refinement
 * const resolved = await resolveArchive(archive, {
 *   include: ["metadata", "readingOrder", "toc", "sources"],
 *   layoutScan: true,
 * })
 * ```
 */
export const resolveArchive = async <
  T extends ReadonlyArray<ResolveArchiveToken> = typeof DEFAULT_INCLUDE,
>(
  archive: Archive,
  options: ResolveArchiveOptions<T> = {},
): Promise<Pick<ResolvedArchive, T[number] | "version">> => {
  const tokens = new Set<ResolveArchiveToken>(
    options.include ?? DEFAULT_INCLUDE,
  )
  const wantsMetadata = tokens.has("metadata")
  const wantsSources = tokens.has("sources")
  const wantsReadingOrder = tokens.has("readingOrder")
  const wantsToc = tokens.has("toc")

  // the scan refines metadata AND per-item layouts, so it runs whenever
  // either projection could reflect it — and needs both computed internally
  const runLayoutScan =
    options.layoutScan === true && (wantsMetadata || wantsReadingOrder)

  // the package document backs every archive-derived token, but a
  // version-only (or empty) projection returns nothing read from the book —
  // skip the read entirely rather than open and parse the OPF for nothing
  // (runLayoutScan implies metadata or readingOrder, so it is covered)
  const wantsOpf =
    wantsMetadata || wantsSources || wantsReadingOrder || wantsToc
  const opf = wantsOpf
    ? await safeRead(() => readArchiveOpf(archive), "opf")
    : undefined

  const wantsSidecars = wantsMetadata || wantsSources || runLayoutScan
  const comicInfo = wantsSidecars
    ? await safeRead(() => readArchiveComicInfo(archive), "comicInfo")
    : undefined
  const apple = wantsSidecars
    ? await safeRead(() => readArchiveApple(archive), "apple")
    : undefined
  const kobo = wantsSidecars
    ? await safeRead(() => readArchiveKobo(archive), "kobo")
    : undefined

  let metadata =
    wantsMetadata || runLayoutScan
      ? resolveMetadata({ opf: opf?.opf, comicInfo, apple, kobo })
      : undefined

  let readingOrder =
    wantsReadingOrder || runLayoutScan
      ? await resolveArchiveReadingOrder(archive, { opf })
      : undefined

  if (
    runLayoutScan &&
    metadata !== undefined &&
    readingOrder !== undefined &&
    metadata.renditionLayout === "reflowable" &&
    readingOrder.every((item) => item.renditionLayout === "reflowable") &&
    (await readingOrderDocumentsAllHaveViewport(archive, readingOrder))
  ) {
    metadata = { ...metadata, renditionLayout: "pre-paginated" }
    readingOrder = readingOrder.map((item) => ({
      ...item,
      renditionLayout: "pre-paginated" as const,
    }))
  }

  // cover and the counted page count are part of the resolved metadata but
  // are container-level derivations (basePath join, first-page fallback, page
  // counting), so they are resolved here where the archive is available and
  // folded into `metadata`. After the scan so both ride the finalized reading
  // order (its layout drives the page count, and the scan can promote it).
  if (wantsMetadata && metadata !== undefined) {
    const order =
      readingOrder ?? (await resolveArchiveReadingOrder(archive, { opf }))
    const cover = await resolveArchiveCover(archive, {
      opf,
      readingOrder: order,
    })
    const numberOfPages =
      metadata.numberOfPages ?? countPrePaginatedPages(order)

    metadata = omitUndefined({ ...metadata, cover, numberOfPages })
  }

  const toc = wantsToc
    ? await safeRead(() => resolveArchiveToc(archive, { opf }), "toc")
    : undefined

  const result: {
    -readonly [K in keyof ResolvedArchive]?: ResolvedArchive[K]
  } & { version: number } = {
    version: RESOLVED_ARCHIVE_VERSION,
  }

  if (wantsMetadata && metadata !== undefined) result.metadata = metadata
  if (wantsReadingOrder && readingOrder !== undefined)
    result.readingOrder = readingOrder
  if (wantsToc && toc !== undefined) result.toc = toc
  if (wantsSources)
    result.sources = omitUndefined({ opf, comicInfo, apple, kobo })

  // `as`: the runtime projection above mirrors the type-level Pick over the
  // same token set; TypeScript cannot connect Set membership checks to the
  // computed Pick keys.
  return result as Pick<ResolvedArchive, T[number] | "version">
}
