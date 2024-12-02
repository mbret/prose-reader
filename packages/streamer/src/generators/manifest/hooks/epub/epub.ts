import xmldoc from "xmldoc"
import { parseToc } from "../../../../parsers/nav"
import type { Manifest } from "@prose-reader/shared"
import { Report } from "../../../../report"
import { Archive } from "../../../../archives/types"
import { getSpineItemInfo } from "./spineItems"
import { getArchiveOpfInfo } from "../../../../epubs/getArchiveOpfInfo"
import { getSpineItemFilesFromArchive } from "../../../../epubs/getSpineItemFilesFromArchive"

const getItemFromElement = (
  element: xmldoc.XmlElement,
  opfBasePath: string,
  getBaseUrl?: (element: xmldoc.XmlElement) => string,
) => {
  const href = element.attr.href || ``
  const baseUrl = getBaseUrl?.(element)

  return {
    href: opfBasePath
      ? `${baseUrl}${opfBasePath}/${href}`
      : `${baseUrl}${href}`,
    id: element.attr.id || ``,
    mediaType: element.attr[`media-type`],
  }
}

export const getItemsFromDoc = (
  doc: xmldoc.XmlDocument,
  archive: Archive,
  getBaseUrl?: (element: xmldoc.XmlElement) => string,
) => {
  const manifestElm = doc.childNamed(`manifest`)
  const { basePath: opfBasePath } = getArchiveOpfInfo(archive) || {}

  return (
    manifestElm
      ?.childrenNamed(`item`)
      ?.map((el) => getItemFromElement(el, opfBasePath, getBaseUrl)) || []
  )
}

export const epubHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const { data: opsFile, basePath: opfBasePath } =
      getArchiveOpfInfo(archive) || {}

    if (!opsFile) {
      return manifest
    }

    const data = await opsFile.string()

    Report.log(`data`, data)

    const opfXmlDoc = new xmldoc.XmlDocument(data)

    const toc = (await parseToc(opfXmlDoc, archive, { baseUrl })) || []

    const metadataElm = opfXmlDoc.childNamed(`metadata`)
    const manifestElm = opfXmlDoc.childNamed(`manifest`)
    const spineElm = opfXmlDoc.childNamed(`spine`)
    const guideElm = opfXmlDoc.childNamed(`guide`)
    const titleElm = metadataElm?.childNamed(`dc:title`)
    const metaElmChildren = metadataElm?.childrenNamed(`meta`) || []
    const metaElmWithRendition = metaElmChildren.find(
      (meta) => meta.attr.property === `rendition:layout`,
    )
    const metaElmWithRenditionFlow = metaElmChildren.find(
      (meta) => meta.attr.property === `rendition:flow`,
    )
    const metaElmWithRenditionSpread = metaElmChildren.find(
      (meta) => meta.attr.property === `rendition:spread`,
    )

    const publisherRenditionLayout = metaElmWithRendition?.val as
      | `reflowable`
      | `pre-paginated`
      | undefined
    const publisherRenditionFlow = metaElmWithRenditionFlow?.val as
      | `scrolled-continuous`
      | `scrolled-doc`
      | `paginated`
      | `auto`
      | undefined
    const renditionSpread = metaElmWithRenditionSpread?.val as
      | `auto`
      | undefined

    const title =
      titleElm?.val || archive.files.find(({ dir }) => dir)?.basename || ``
    const pageProgressionDirection = spineElm?.attr[
      `page-progression-direction`
    ] as `ltr` | `rtl` | undefined

    const archiveSpineItems = await getSpineItemFilesFromArchive({ archive })

    const totalSize = archiveSpineItems.reduce(
      (size, file) => file.size + size,
      0,
    )

    return {
      filename: archive.filename,
      nav: {
        toc,
      },
      renditionLayout: publisherRenditionLayout,
      renditionFlow: publisherRenditionFlow || `auto`,
      renditionSpread,
      title,
      readingDirection: pageProgressionDirection || `ltr`,
      /**
       * @see https://www.w3.org/TR/epub/#sec-itemref-elem
       */
      spineItems:
        spineElm?.childrenNamed(`itemref`).map((itemrefElm, index) => {
          const manifestItem = manifestElm
            ?.childrenNamed(`item`)
            .find((item) => item.attr.id === itemrefElm?.attr.idref)
          const href = manifestItem?.attr.href || ``
          const itemSize =
            archive.files.find((file) => file.uri.endsWith(href))?.size || 0

          const hrefBaseUri = baseUrl
            ? baseUrl
            : /^https?:\/\//.test(href)
              ? ""
              : "file://"

          const spineItemInfo = getSpineItemInfo(itemrefElm)

          return {
            ...spineItemInfo,
            id: manifestItem?.attr.id || ``,
            index,
            href: manifestItem?.attr.href?.startsWith(`https://`)
              ? manifestItem?.attr.href
              : opfBasePath
                ? `${hrefBaseUri}${opfBasePath}/${manifestItem?.attr.href}`
                : `${hrefBaseUri}${manifestItem?.attr.href}`,
            renditionLayout:
              spineItemInfo.renditionLayout ?? publisherRenditionLayout,
            progressionWeight: itemSize / totalSize,
            // size: itemSize
            mediaType: manifestItem?.attr[`media-type`],
          }
        }) || [],
      items: getItemsFromDoc(opfXmlDoc, archive, (element) => {
        const href = element.attr.href || ``

        if (/^https?:\/\//.test(href)) {
          return ""
        }

        return baseUrl || "file://"
      }),
      guide: guideElm?.childrenNamed(`reference`).map((elm) => {
        return {
          href: elm.attr.href || ``,
          title: elm.attr.title || ``,
          type: elm.attr.type as NonNullable<Manifest[`guide`]>[number][`type`],
        }
      }),
    }
  }
