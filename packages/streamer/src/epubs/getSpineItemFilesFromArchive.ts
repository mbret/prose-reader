import xmldoc from "xmldoc"
import type { Archive } from "../archives/types"
import { getArchiveOpfInfo } from "./getArchiveOpfInfo"

export const getSpineItemFilesFromArchive = async ({
  archive,
}: {
  archive: Archive
}) => {
  const { data: opsFile, basePath: opfBasePath } =
    getArchiveOpfInfo(archive) || {}

  const data = await opsFile?.string()

  if (!data) return []

  const _opfXmlDoc = new xmldoc.XmlDocument(data)

  const manifestElm = _opfXmlDoc.childNamed(`manifest`)
  const spineElm = _opfXmlDoc.childNamed(`spine`)

  const spineItemIds = spineElm
    ?.childrenNamed(`itemref`)
    .map((item) => item.attr.idref) as string[]
  const manifestItemsFromSpine =
    manifestElm
      ?.childrenNamed(`item`)
      .filter((item) => spineItemIds.includes(item.attr.id || ``)) || []

  const archiveSpineItems = archive.files.filter((file) => {
    return manifestItemsFromSpine.find((item) => {
      if (!opfBasePath) return `${item.attr.href}` === file.uri
      return `${opfBasePath}/${item.attr.href}` === file.uri
    })
  })

  return archiveSpineItems
}
