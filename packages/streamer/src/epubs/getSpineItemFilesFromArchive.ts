import type { Archive } from "../archives/types"
import type { ArchiveOpfParsed } from "./readArchiveOpf"

export const getSpineItemFilesFromArchive = async ({
  archive,
  archiveOpf,
}: {
  archive: Archive
  archiveOpf: ArchiveOpfParsed | undefined
}) => {
  if (!archiveOpf) return []

  const { opf, basePath: opfBasePath } = archiveOpf
  const { spineRows } = opf

  const archiveSpineItems = archive.records.filter((file) => {
    return spineRows.find((item) => {
      if (!opfBasePath) return `${item.href}` === file.uri
      return `${opfBasePath}/${item.href}` === file.uri
    })
  })

  return archiveSpineItems
}
