import type { AppleMetadata } from "./apple/parse.ts"
import { readArchiveApple } from "./apple/readArchiveApple.ts"
import type { Archive } from "./archives/types.ts"
import type { ComicInfo } from "./comicInfo/parse.ts"
import { readArchiveComicInfo } from "./comicInfo/readArchiveComicInfo.ts"
import { resolveArchiveCover } from "./cover/resolveArchiveCover.ts"
import type { KoboMetadata } from "./kobo/parse.ts"
import { readArchiveKobo } from "./kobo/readArchiveKobo.ts"
import { readingOrderDocumentsAllHaveViewport } from "./layout/scanReadingOrderDocumentsViewport.ts"
import { isArchiveEpub } from "./opf/isArchiveEpub.ts"
import type { ArchiveOpfParsed } from "./opf/readArchiveOpf.ts"
import { readArchiveOpf } from "./opf/readArchiveOpf.ts"
import type { ArchiveReadingOrderItem } from "./readingOrder/resolveArchiveReadingOrder.ts"
import { resolveArchiveReadingOrder } from "./readingOrder/resolveArchiveReadingOrder.ts"
import { Report } from "./report.ts"
import { resolveMetadata } from "./resolveMetadata.ts"
import { resolveArchiveToc } from "./toc/resolveArchiveToc.ts"
import type { ArchiveTocItem } from "./toc/types.ts"
import type { ResolvedMetadata } from "./types/resolvedMetadata.ts"
import { omitUndefined } from "./utils/omitUndefined.ts"

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

export type ResolvedArchiveSourceKind = keyof ResolvedArchiveSources

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
  /**
   * Sources the container carries but that yielded no parsed value: declared
   * yet broken, which `sources` alone cannot express — an absent source and an
   * unreadable one both read as `undefined` there.
   *
   * Always present (empty when every carried source parsed), whatever the
   * projection: a consumer refusing to accept a corrupt publication should not
   * have to ask for `sources`, nor re-derive the container format from the
   * archive records to tell the two cases apart.
   *
   * ```ts
   * const { metadata, unreadableSources } = await resolveArchive(archive)
   *
   * if (unreadableSources.includes("opf")) {
   *   throw new Error("Archive carries an OPF package document it cannot parse")
   * }
   * ```
   *
   * A source counts as unreadable when its document (or, for the package
   * document, any `.opf` record in the container) is there and reading or
   * parsing it did not produce a value — the resolve itself never fails, so
   * this is the only trace left. A projection that reads nothing from the book
   * reports nothing.
   */
  readonly unreadableSources: ResolvedArchiveSourceKind[]
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
 * - `version`, `unreadableSources`: free, and always present regardless of
 *   projection.
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

/**
 * `failed` separates "the read threw" from "the read found nothing", which
 * `value === undefined` conflates — the distinction `unreadableSources`
 * reports.
 */
type SafeRead<T> = { value: T | undefined; failed: boolean }

const safeRead = async <T>(
  read: () => Promise<T>,
  source: string,
): Promise<SafeRead<T>> => {
  try {
    return { value: await read(), failed: false }
  } catch (e) {
    // books in the wild are dirty: a malformed source never fails the
    // resolve, it just doesn't contribute
    Report.error(`resolveArchive: unable to read ${source}`, e)

    return { value: undefined, failed: true }
  }
}

/**
 * The counted page count: one page per pre-paginated *page-like* reading-order
 * item — an image or a fixed-layout document (comics, image archives, fixed
 * layout). Reflowable documents are not pre-paginated, so they never count.
 * Audio and video are pre-paginated discrete media too, but a track or clip is
 * not a page, so they are excluded — an audiobook or video archive has no page
 * count. Absent when nothing page-like is present.
 */
const countPages = (
  readingOrder: ArchiveReadingOrderItem[],
): number | undefined => {
  const isAudioOrVideo = (mediaType: string | undefined): boolean =>
    mediaType?.startsWith("audio/") === true ||
    mediaType?.startsWith("video/") === true

  const count = readingOrder.filter(
    (item) =>
      item.renditionLayout === "pre-paginated" &&
      !isAudioOrVideo(item.mediaType),
  ).length

  return count > 0 ? count : undefined
}

/**
 * A sidecar reader returns `undefined` only when the container does not carry
 * the document at all, so a throw is the whole broken signal. The package
 * document has one more broken shape: a container carrying an `.opf` record
 * whose package document never reaches the parser (a name the OPF discovery
 * does not match, a directory record). `isArchiveEpub` is the carrier test
 * there, which is exactly what consumers had to reach for themselves.
 */
const collectUnreadableSources = ({
  archive,
  opf,
  comicInfo,
  apple,
  kobo,
}: {
  archive: Archive
  opf: SafeRead<ArchiveOpfParsed | undefined> | undefined
  comicInfo: SafeRead<ComicInfo | undefined> | undefined
  apple: SafeRead<AppleMetadata | undefined> | undefined
  kobo: SafeRead<KoboMetadata | undefined> | undefined
}): ResolvedArchiveSourceKind[] => {
  const unreadable: ResolvedArchiveSourceKind[] = []

  if (opf !== undefined && opf.value === undefined) {
    if (opf.failed || isArchiveEpub(archive)) unreadable.push("opf")
  }

  if (comicInfo?.failed) unreadable.push("comicInfo")
  if (apple?.failed) unreadable.push("apple")
  if (kobo?.failed) unreadable.push("kobo")

  return unreadable
}

const RESOLVED_ARCHIVE_VERSION = 3

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
 * const identifiers = comicInfo?.identifiers ?? opf?.identifiers
 *
 * // reject a publication whose package document is there but broken
 * const { unreadableSources } = await resolveArchive(archive)
 * if (unreadableSources.includes("opf")) throw new Error("broken OPF")
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
): Promise<
  Pick<ResolvedArchive, T[number] | "version" | "unreadableSources">
> => {
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
  const opfRead = wantsOpf
    ? await safeRead(() => readArchiveOpf(archive), "opf")
    : undefined
  const opf = opfRead?.value

  const wantsSidecars = wantsMetadata || wantsSources || runLayoutScan
  const comicInfoRead = wantsSidecars
    ? await safeRead(() => readArchiveComicInfo(archive), "comicInfo")
    : undefined
  const comicInfo = comicInfoRead?.value
  const appleRead = wantsSidecars
    ? await safeRead(() => readArchiveApple(archive), "apple")
    : undefined
  const apple = appleRead?.value
  const koboRead = wantsSidecars
    ? await safeRead(() => readArchiveKobo(archive), "kobo")
    : undefined
  const kobo = koboRead?.value

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
    const numberOfPages = metadata.numberOfPages ?? countPages(order)

    metadata = omitUndefined({ ...metadata, cover, numberOfPages })
  }

  const toc = wantsToc
    ? (await safeRead(() => resolveArchiveToc(archive, { opf }), "toc")).value
    : undefined

  const result: {
    -readonly [K in keyof ResolvedArchive]?: ResolvedArchive[K]
  } & Pick<ResolvedArchive, "version" | "unreadableSources"> = {
    version: RESOLVED_ARCHIVE_VERSION,
    unreadableSources: collectUnreadableSources({
      archive,
      opf: opfRead,
      comicInfo: comicInfoRead,
      apple: appleRead,
      kobo: koboRead,
    }),
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
  return result as Pick<
    ResolvedArchive,
    T[number] | "version" | "unreadableSources"
  >
}
