import {
  detectMimeTypeFromName,
  type Manifest,
  parseContentType,
} from "@prose-reader/shared"
import type { Archive } from "../../../archives/types"

type Toc = NonNullable<Manifest["nav"]>["toc"]

export const normalizeFilenameAsTitle = (filename: string) =>
  filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

export const buildAudiobookToc = (
  manifest: Manifest,
  archive: Archive,
): Toc | undefined => {
  if (manifest.spineItems.length === 0) return undefined

  const allAudio = manifest.spineItems.every((item) => {
    const mimeType =
      parseContentType(item.mediaType ?? "") ||
      detectMimeTypeFromName(item.href)

    return mimeType?.startsWith("audio/")
  })

  if (!allAudio) return undefined

  return manifest.spineItems.map((item) => {
    const record = archive.records.find(
      (r) => !r.dir && decodeURI(item.href).endsWith(r.uri),
    )

    return {
      title: normalizeFilenameAsTitle(record?.basename ?? item.href),
      href: item.href,
      path: record?.uri ?? item.href,
      contents: [],
    }
  })
}
