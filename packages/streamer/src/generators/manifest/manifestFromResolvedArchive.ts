import {
  type Archive,
  type ArchiveTocItem,
  mainTitle,
  type ResolvedArchive,
} from "@prose-reader/archive-reader"
import type { Manifest } from "@prose-reader/shared"
import { createXmlSafeIdFactory, urlJoin } from "@prose-reader/shared"
import { buildAudiobookToc } from "./audiobookToc"
import { createManifestResourceHref } from "./createManifestResourceHref"

type TocItem = NonNullable<Manifest["nav"]>["toc"][number]
type ManifestGuideEntry = NonNullable<Manifest["guide"]>[number]

/**
 * The archive reader resolves references within the container, the streamer
 * owns where they are served from.
 */
const toManifestTocItem =
  (baseUrl: string) =>
  (item: ArchiveTocItem): TocItem => ({
    title: item.title,
    path: item.path,
    // rebase the container-relative ref into serving space; entries without a
    // target (eg nav heading without link) keep an empty href
    href: item.containerHref ? urlJoin(baseUrl, item.containerHref) : ``,
    contents: item.contents.map(toManifestTocItem(baseUrl)),
  })

const manifestGuideType = (
  raw: string | undefined,
): ManifestGuideEntry["type"] | undefined => {
  const v = raw?.trim()
  if (
    v === `cover` ||
    v === `title-page` ||
    v === `copyright-page` ||
    v === `text`
  ) {
    return v
  }
  return undefined
}

const isHttpUrl = (value: string) => /^https?:\/\//.test(value)

const firstDirectoryTitle = (archive: Archive): string | undefined =>
  archive.records.find(({ dir }) => dir)?.basename.replace(/\/$/, ``)

/**
 * The subset of {@link ResolvedArchive} the manifest mapping consumes: the
 * normalized publication plus `sources` — the OPF manifest (all package
 * resources, not just the spine) and the legacy guide only exist there.
 */
type ResolvedArchiveForManifest = Pick<
  ResolvedArchive,
  "metadata" | "readingOrder" | "toc" | "sources"
>

const epubManifest = (
  archive: Archive,
  baseUrl: string,
  resolved: ResolvedArchiveForManifest,
  opf: NonNullable<ResolvedArchiveForManifest["sources"]["opf"]>,
): Manifest => {
  const { metadata, readingOrder } = resolved
  const opfBasePath = opf.basePath

  const guide: ManifestGuideEntry[] = []
  for (const reference of opf.opf.guide) {
    const type = manifestGuideType(reference.type)
    if (type === undefined) continue
    // guide hrefs stay as authored (opf-relative), matching the legacy
    // EPUB 2 contract consumers already handle
    guide.push({ href: reference.href, title: reference.title, type })
  }

  const createSafeId = createXmlSafeIdFactory()

  return {
    filename: archive.filename ?? ``,
    title: mainTitle(metadata) || firstDirectoryTitle(archive) || ``,
    renditionLayout: metadata.renditionLayout,
    renditionFlow: metadata.renditionFlow ?? `auto`,
    renditionSpread: metadata.renditionSpread,
    readingDirection: metadata.readingDirection,
    spineItems: readingOrder.map((item, index) => ({
      id: item.id ?? createSafeId(item.uri),
      index,
      // remote resources pass through; local ones get the serving base, or
      // the file:// scheme when the manifest is not served from anywhere
      href: isHttpUrl(item.uri)
        ? item.uri
        : `${baseUrl || `file://`}${item.uri}`,
      renditionLayout: item.renditionLayout,
      ...(item.renditionFlow !== undefined
        ? { renditionFlow: item.renditionFlow }
        : {}),
      progressionWeight: item.progressionWeight,
      pageSpreadLeft: item.pageSpreadLeft,
      pageSpreadRight: item.pageSpreadRight,
      mediaType: item.mediaType,
    })),
    items: opf.opf.manifestItems.map((item) => ({
      id: item.id,
      href: isHttpUrl(item.href)
        ? item.href
        : `${baseUrl || `file://`}${opfBasePath ? `${opfBasePath}/` : ``}${item.href}`,
      mediaType: item.mediaType,
    })),
    guide: guide.length > 0 ? guide : undefined,
    nav: {
      // EPUB-like containers keep an explicit (possibly empty) toc
      toc: (resolved.toc ?? []).map(toManifestTocItem(baseUrl)),
    },
  }
}

const recordsManifest = (
  archive: Archive,
  baseUrl: string,
  resolved: ResolvedArchiveForManifest,
): Manifest => {
  const { metadata, readingOrder } = resolved

  const files = archive.records.filter((file) => !file.dir)
  const createSafeId = createXmlSafeIdFactory()
  const idByUri = new Map(
    files.map((file) => [file.uri, createSafeId(file.uri)]),
  )

  const manifest: Manifest = {
    filename: archive.filename ?? ``,
    title:
      mainTitle(metadata) ||
      firstDirectoryTitle(archive) ||
      archive.filename ||
      ``,
    renditionLayout: metadata.renditionLayout,
    renditionSpread: `auto`,
    readingDirection: metadata.readingDirection,
    spineItems: readingOrder.map((item, index) => ({
      id: idByUri.get(item.uri) ?? createSafeId(item.uri),
      index,
      href: createManifestResourceHref({ baseUrl, resourcePath: item.uri }),
      renditionLayout: item.renditionLayout,
      progressionWeight: item.progressionWeight,
      pageSpreadLeft: undefined,
      pageSpreadRight: undefined,
      mediaType: item.mediaType,
    })),
    // every container file stays addressable, sidecars included — items is
    // the resource map, the reading order is the curation
    items: files.map((file) => ({
      id: idByUri.get(file.uri) ?? createSafeId(file.uri),
      href: encodeURI(`${baseUrl}${file.uri}`),
    })),
  }

  const audiobookToc = buildAudiobookToc(manifest, archive)
  const toc = audiobookToc ?? resolved.toc?.map(toManifestTocItem(baseUrl))

  return toc !== undefined ? { ...manifest, nav: { toc } } : manifest
}

/**
 * Maps a resolved archive into the streamer's serving space: hrefs get the
 * base url (or `file://`) baked in, ids become XML-safe, defaults are the
 * manifest's own. The container understanding itself (format detection,
 * metadata precedence, spine rules) all happened in
 * `@prose-reader/archive-reader`.
 */
export const manifestFromResolvedArchive = ({
  archive,
  baseUrl,
  resolved,
}: {
  archive: Archive
  baseUrl: string
  resolved: ResolvedArchiveForManifest
}): Manifest => {
  const opf = resolved.sources.opf

  if (opf) return epubManifest(archive, baseUrl, resolved, opf)

  return recordsManifest(archive, baseUrl, resolved)
}
