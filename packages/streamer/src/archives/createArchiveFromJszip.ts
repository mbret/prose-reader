import { Report } from "../report"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import type { Archive, StreamResult } from "./types"

interface OutputByType {
  base64: string
  string: string
  text: string
  binarystring: string
  array: number[]
  uint8array: Uint8Array
  arraybuffer: ArrayBuffer
  blob: Blob
  nodebuffer: Buffer
}

type OutputType = keyof OutputByType

interface JSZipObject {
  name: string
  dir: boolean
  date: Date
  comment: string
  unixPermissions: number | string | null
  dosPermissions: number | null
  async<T extends OutputType>(type: T): Promise<OutputByType[T]>
  // nodeStream(type?: `nodebuffer`): NodeJS.ReadableStream;
  internalStream?: (type?: `uint8array`) => StreamResult
}

interface JSZip {
  files: { [key: string]: JSZipObject }
}

export const createArchiveFromJszip = async (
  jszip: JSZip,
  { orderByAlpha, name }: { orderByAlpha?: boolean; name?: string } = {},
): Promise<Archive> => {
  let files = Object.values(jszip.files)

  if (orderByAlpha) {
    files = files.slice().sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  const archive: Archive = {
    filename: name || ``,
    records: files.map((file) => ({
      dir: file.dir,
      basename: getUriBasename(file.name),
      uri: file.name,
      blob: () => file.async(`blob`),
      string: () => file.async("string"),
      ...(file.internalStream && {
        stream: file.internalStream,
      }),
      // this is private API
      // @ts-expect-error
      size: file._data.uncompressedSize,
    })),
    close: () => Promise.resolve(),
  }

  Report.log("Generated archive", archive)

  return archive
}
