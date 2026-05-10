import type { Archive } from "../archives/types"

const hasOpfExtension = (path: string) => path.toLowerCase().endsWith(`.opf`)

export const isArchiveEpub = (archive: Archive) => {
  return archive.records.some(
    (file) =>
      !file.dir &&
      (hasOpfExtension(file.basename) || hasOpfExtension(file.uri)),
  )
}
