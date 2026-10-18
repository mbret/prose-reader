import {
  detectMimeTypeFromName,
  getUriBasename,
  type Manifest,
  parseContentType,
} from "@prose-reader/shared"

type Toc = NonNullable<Manifest["nav"]>["toc"]

export const normalizeFilenameAsTitle = (filename: string) =>
  filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/**
 * One entry per track for a book made only of audio, each titled after the
 * archive record it plays.
 */
export const buildAudiobookToc = (manifest: Manifest): Toc | undefined => {
  if (manifest.spineItems.length === 0) return undefined

  const allAudio = manifest.spineItems.every((item) => {
    const mimeType =
      parseContentType(item.mediaType ?? "") ||
      detectMimeTypeFromName(item.containerUri)

    return mimeType?.startsWith("audio/")
  })

  if (!allAudio) return undefined

  return manifest.spineItems.map((item) => ({
    title: normalizeFilenameAsTitle(getUriBasename(item.containerUri)),
    href: item.href,
    path: item.containerUri,
    contents: [],
  }))
}
