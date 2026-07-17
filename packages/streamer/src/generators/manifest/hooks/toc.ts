import {
  type Archive,
  type ArchiveOpfParsed,
  type ArchiveTocItem,
  resolveArchiveToc,
} from "@prose-reader/archive-reader"
import { type Manifest, urlJoin } from "@prose-reader/shared"
import { buildAudiobookToc } from "./audiobookToc"

type Toc = NonNullable<Manifest["nav"]>["toc"]
type TocItem = NonNullable<Manifest["nav"]>["toc"][number]

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

const resolveTocFromArchive = async (
  archive: Archive,
  manifest: Manifest,
  {
    baseUrl,
    archiveOpf,
  }: { baseUrl: string; archiveOpf: ArchiveOpfParsed | undefined },
): Promise<Toc | undefined> => {
  if (archiveOpf) {
    const toc = await resolveArchiveToc(archive, { opf: archiveOpf })

    // Keep explicit empty TOC for EPUB-like inputs even when there is no nav file.
    return (toc ?? []).map(toManifestTocItem(baseUrl))
  }

  const audiobookToc = buildAudiobookToc(manifest, archive)
  if (audiobookToc) return audiobookToc

  const toc = await resolveArchiveToc(archive)

  if (!toc) return undefined

  return toc.map(toManifestTocItem(baseUrl))
}

/**
 * Resolve the table of contents from a single entry point.
 * Internally handles EPUB nav, NCX, and folder fallback.
 */
export const tocHook =
  ({
    archive,
    baseUrl,
    archiveOpf,
  }: {
    archive: Archive
    baseUrl: string
    archiveOpf: ArchiveOpfParsed | undefined
  }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    if (manifest.nav) return manifest

    const toc = await resolveTocFromArchive(archive, manifest, {
      baseUrl,
      archiveOpf,
    })
    if (!toc) return manifest

    return {
      ...manifest,
      nav: {
        toc,
      },
    }
  }
