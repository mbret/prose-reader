/**
 * @see https://github.com/nika-begiashvili/libarchivejs.
 *
 * Does not work in service worker due to usage of web worker.
 */
// libarchive.js only re-exports `Archive` from its package root; the reader and
// compressed-file types live in the compiled output, so we reach for them there.
import type { ArchiveReader } from "libarchive.js/dist/build/compiled/archive-reader"
import type { CompressedFile } from "libarchive.js/dist/build/compiled/compressed-file"
import { createArchiveFromEntries } from "./createArchiveFromEntries"
import { blobFileAccessors } from "./fileAccessors"
import type { Archive } from "./types"

export const createArchiveFromLibArchive = async (
  libArchive: ArchiveReader,
  options: { orderByAlpha?: boolean; name: string; encodingFormat?: string },
): Promise<Archive> => {
  const objArray = await libArchive.getFilesArray()

  return createArchiveFromEntries(
    objArray,
    (item: { file: CompressedFile; path: string }) => ({
      dir: false,
      uri: `${item.path}${item.file.name}`,
      size: item.file.size,
      // libarchivejs `extract()` is typed `any`; it resolves to a `File`.
      ...blobFileAccessors(() => item.file.extract() as Promise<File>),
    }),
    { ...options, close: () => libArchive.close() },
  )
}
