import { Report } from "../report"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import { Archive, StreamResult } from "./types"

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
  { orderByAlpha, name }: { orderByAlpha?: boolean; name?: string } = {}
): Promise<Archive> => {
  let files = Object.values(jszip.files)

  if (orderByAlpha) {
    files = files.sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  const archive = {
    filename: name || ``,
    files: files.map((file) => ({
      dir: file.dir,
      basename: getUriBasename(file.name),
      uri: file.name,
      blob: () => file.async(`blob`),
      string: () => file.async(`string`),
      base64: () => file.async(`base64`),
      ...(file.internalStream && {
        stream: file.internalStream,
      }),
      // this is private API
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      size: file._data.uncompressedSize,
    })),
  }

  Report.log("Generated archive", archive)

  return archive
}
