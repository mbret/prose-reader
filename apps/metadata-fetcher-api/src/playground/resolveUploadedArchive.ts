import { type Archive, resolveArchive } from "@prose-reader/archive-reader"
import { createArchiveFromZipJs } from "@prose-reader/archive-reader/archives/createArchiveFromZipJs"
import {
  type FetchMetadataInput,
  metadataInputFromResolvedArchive,
} from "@prose-reader/metadata-fetcher"
import { Uint8ArrayReader, ZipReader } from "@zip.js/zip.js"

/**
 * Reads an uploaded ZIP-based publication without writing or retaining it.
 * The returned entity is plain JSON; closing the archive releases zip.js as
 * soon as archive-reader has resolved the package metadata.
 */
export const resolveUploadedArchive = async (
  bytes: Uint8Array,
  options: { filename: string; encodingFormat?: string },
): Promise<FetchMetadataInput> => {
  const zipReader = new ZipReader(new Uint8ArrayReader(bytes))
  let archive: Archive | undefined

  try {
    archive = await createArchiveFromZipJs(zipReader, {
      name: options.filename,
      ...(options.encodingFormat !== undefined
        ? { encodingFormat: options.encodingFormat }
        : {}),
    })
    const resolved = await resolveArchive(archive, {
      include: ["metadata"],
    })

    return metadataInputFromResolvedArchive(resolved)
  } finally {
    if (archive !== undefined) {
      await archive.close()
    } else {
      await zipReader.close()
    }
  }
}
