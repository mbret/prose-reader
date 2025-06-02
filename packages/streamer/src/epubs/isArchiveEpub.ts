import type { Archive } from "../archives/types"

export const isArchiveEpub = (archive: Archive) => {
  return archive.records.some((file) => file.basename.endsWith(`.opf`))
}
