import { parseContentType } from "@prose-reader/shared"
import type { Archive } from "@prose-reader/streamer"

export const CBZ_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/vnd.comicbook+zip",
  "application/x-cbz",
])

const hasCbzExtension = (name: string) => name.toLowerCase().endsWith(".cbz")

export const isCbzArchive = (archive: Archive) => {
  const mimeType = parseContentType(archive.encodingFormat ?? "")

  if (mimeType && CBZ_MIME_TYPES.has(mimeType)) return true
  if (hasCbzExtension(archive.filename ?? "")) return true

  return false
}
