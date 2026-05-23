import { resolveArchiveMetadata } from "@prose-reader/archive-parser"
import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "../../../../archives/types"
import { getArchiveOpfInfo } from "../../../../epubs/getArchiveOpfInfo"
import { getSpineItemFilesFromArchive } from "../../../../epubs/getSpineItemFilesFromArchive"
import type { ArchiveOpfParsed } from "../../../../epubs/readArchiveOpf"
import { Report } from "../../../../report"

export const getItemsFromDoc = (
  manifestItems: ReadonlyArray<{
    id: string
    href: string
    mediaType?: string
  }>,
  archive: Archive,
  getBaseUrlForHref?: (href: string) => string,
) => {
  const { basePath: opfBasePath } = getArchiveOpfInfo(archive) || {}

  return manifestItems.map((el) => {
    const href = el.href
    const baseUrl = getBaseUrlForHref?.(href) ?? ``

    return {
      href: opfBasePath
        ? `${baseUrl}${opfBasePath}/${href}`
        : `${baseUrl}${href}`,
      id: el.id,
      mediaType: el.mediaType,
    }
  })
}

const manifestRenditionFlow = (
  raw: string | undefined,
): NonNullable<Manifest[`renditionFlow`]> => {
  const v = raw?.trim()
  if (
    v === `scrolled-continuous` ||
    v === `scrolled-doc` ||
    v === `paginated` ||
    v === `auto`
  ) {
    return v
  }
  return `auto`
}

const manifestRenditionSpread = (
  raw: string | undefined,
): Manifest[`renditionSpread`] => {
  const v = raw?.trim()
  if (
    v === `none` ||
    v === `landscape` ||
    v === `portrait` ||
    v === `both` ||
    v === `auto`
  ) {
    return v
  }
  return undefined
}

type ManifestGuideEntry = NonNullable<Manifest[`guide`]>[number]

const manifestGuideType = (
  raw: string | undefined,
): ManifestGuideEntry[`type`] | undefined => {
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

export const epubHook =
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
    if (!archiveOpf) {
      return manifest
    }

    const { opf, basePath: opfBasePath } = archiveOpf
    const resolved = resolveArchiveMetadata(opf)

    Report.groupCollapsed(...Report.getGroupArgs(`OPF parsed`))
    Report.log(`opf`, opf)
    Report.groupEnd()

    const publisherRenditionLayout = opf.renditionLayoutMeta?.trim()
    const packageRenditionLayout =
      publisherRenditionLayout === `reflowable` ||
      publisherRenditionLayout === `pre-paginated`
        ? publisherRenditionLayout
        : resolved.renditionLayout

    const title =
      opf.title?.trim() ||
      archive.records.find(({ dir }) => dir)?.basename ||
      ``

    const readingDirection =
      resolved.readingDirection ?? manifest.readingDirection

    const archiveSpineItems = await getSpineItemFilesFromArchive({
      archive,
      archiveOpf,
    })

    const totalSize = archiveSpineItems.reduce(
      (size, file) => file.size + size,
      0,
    )

    const guideRefs = opf.guide
    const guide: ManifestGuideEntry[] = []
    for (const elm of guideRefs) {
      const type = manifestGuideType(elm.type)
      if (type === undefined) continue
      guide.push({ href: elm.href, title: elm.title, type })
    }

    return {
      filename: archive.filename,
      renditionLayout: packageRenditionLayout,
      renditionFlow: manifestRenditionFlow(opf.renditionFlowMeta),
      renditionSpread: manifestRenditionSpread(opf.renditionSpreadMeta),
      title,
      readingDirection,
      /**
       * @see https://www.w3.org/TR/epub/#sec-itemref-elem
       */
      spineItems: opf.spineRows.map((row, index) => {
        const itemSize =
          archive.records.find((file) => file.uri.endsWith(row.href))?.size || 0

        const hrefBaseUri = baseUrl
          ? baseUrl
          : /^https?:\/\//.test(row.href)
            ? ``
            : `file://`

        return {
          id: row.id,
          index,
          href: row.href.startsWith(`https://`)
            ? row.href
            : opfBasePath
              ? `${hrefBaseUri}${opfBasePath}/${row.href}`
              : `${hrefBaseUri}${row.href}`,
          renditionLayout: row.renditionLayout ?? packageRenditionLayout,
          ...(row.renditionFlow !== undefined
            ? { renditionFlow: row.renditionFlow }
            : {}),
          progressionWeight: itemSize / totalSize,
          pageSpreadLeft: row.pageSpreadLeft,
          pageSpreadRight: row.pageSpreadRight,
          mediaType: row.mediaType,
        }
      }),
      items: getItemsFromDoc(opf.manifestItems, archive, (href) => {
        if (/^https?:\/\//.test(href)) {
          return ``
        }

        return baseUrl || `file://`
      }),
      guide: guide.length > 0 ? guide : undefined,
    }
  }
