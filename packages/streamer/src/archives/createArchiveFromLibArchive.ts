/**
 * @see https://github.com/nika-begiashvili/libarchivejs.
 *
 * Does not work in service worker due to usage of web worker.
 */
import { detectMimeTypeFromName } from "@prose-reader/shared"
// libarchive.js only re-exports `Archive` from its package root; the reader and
// compressed-file types live in the compiled output, so we reach for them there.
import type { ArchiveReader } from "libarchive.js/dist/build/compiled/archive-reader"
import type { CompressedFile } from "libarchive.js/dist/build/compiled/compressed-file"
import { Report } from "../report"
import { createArchive } from "./createArchive"
import { blobFileAccessors } from "./fileAccessors"
import type { Archive } from "./types"

export const createArchiveFromLibArchive = async (
  libArchive: ArchiveReader,
  {
    name,
    encodingFormat,
  }: { orderByAlpha?: boolean; name: string; encodingFormat?: string },
): Promise<Archive> => {
  const objArray = await libArchive.getFilesArray()

  const archive = createArchive({
    close: () => libArchive.close(),
    filename: name,
    encodingFormat,
    records: objArray.map((item: { file: CompressedFile; path: string }) => ({
      dir: false,
      basename: item.file.name,
      encodingFormat: detectMimeTypeFromName(item.file.name),
      size: item.file.size,
      uri: `${item.path}${item.file.name}`,
      // libarchivejs `extract()` is typed `any`; it resolves to a `File`.
      ...blobFileAccessors(() => item.file.extract() as Promise<File>),
    })),
  })

  Report.log("Generated archive", archive)

  return archive
}
