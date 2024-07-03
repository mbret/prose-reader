/**
 * @see https://github.com/nika-begiashvili/libarchivejs.
 *
 * Does not work in service worker due to usage of web worker.
 */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Report } from "../report"
import { Archive } from "./types"

export declare class ArchiveReader {
  private file
  private client
  private worker
  private _content
  private _processed
  constructor(file: File, client: any, worker: any)
  /**
   * Prepares file for reading
   * @returns {Promise<Archive>} archive instance
   */
  open(): Promise<ArchiveReader>
  /**
   * Terminate worker to free up memory
   */
  close(): Promise<void>
  /**
   * detect if archive has encrypted data
   * @returns {boolean|null} null if could not be determined
   */
  hasEncryptedData(): Promise<boolean | null>
  /**
   * set password to be used when reading archive
   */
  usePassword(archivePassword: string): Promise<void>
  /**
   * Set locale, defaults to en_US.UTF-8
   */
  setLocale(locale: string): Promise<void>
  /**
   * Returns object containing directory structure and file information
   * @returns {Promise<object>}
   */
  getFilesObject(): Promise<any>
  getFilesArray(): Promise<any[]>
  extractSingleFile(target: string): Promise<File>
  /**
   * Returns object containing directory structure and extracted File objects
   * @param {Function} extractCallback
   *
   */
  extractFiles(extractCallback?: Function | undefined): Promise<any>
}

/**
 * Represents compressed file before extraction
 */
export declare class CompressedFile {
  constructor(
    name: string,
    size: number,
    path: string,
    lastModified: number,
    archiveRef: ArchiveReader,
  )
  private _name
  private _size
  private _path
  private _lastModified
  private _archiveRef
  /**
   * File name
   */
  get name(): string
  /**
   * File size
   */
  get size(): number
  get lastModified(): number
  /**
   * Extract file from archive
   * @returns {Promise<File>} extracted file
   */
  extract(): any
}

export const createArchiveFromLibArchive = async (
  libArchive: ArchiveReader,
  { name }: { orderByAlpha?: boolean; name?: string } = {},
): Promise<Archive> => {
  const objArray = await libArchive.getFilesArray()

  const archive: Archive = {
    close: () => libArchive.close(),
    filename: name ?? ``,
    files: objArray.map((item: { file: CompressedFile; path: string }) => ({
      dir: false,
      basename: item.file.name,
      size: item.file.size,
      uri: `${item.path}${item.file.name}`,
      base64: async () => {
        return ``
      },
      blob: async () => {
        const file = await (item.file.extract() as Promise<File>)

        return file
      },
      string: async () => {
        const file = await (item.file.extract() as Promise<File>)

        return file.text()
      },
    })),
  }

  Report.log("Generated archive", archive)

  return archive
}
