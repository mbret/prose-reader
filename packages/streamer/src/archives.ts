import { sortByTitleComparator } from "./utils"

interface StreamResult {
  on(e: `data`, cb: (data: Uint8Array) => void): void
  on(e: `error`, cb: (error: Error) => void): void
  on(e: `end`, cb: () => void): void
  resume(): void
}

export type Archive = {
  filename: string,
  files: {
    dir: boolean,
    basename: string,
    uri: string,
    blob: () => Promise<Blob>,
    string: () => Promise<string>,
    base64: () => Promise<string>,
    stream?: () => StreamResult
    size: number,
    encodingFormat?: undefined | `text/plain`,
  }[]
}

const getBasename = (uri: string) => uri.substring(uri.lastIndexOf(`/`) + 1) || uri

export const getArchiveOpfInfo = (archive: Archive) => {
  const filesAsArray = Object.values(archive.files).filter(file => !file.dir)
  const file = filesAsArray.find(file => file.uri.endsWith(`.opf`))

  return {
    data: file,
    basePath: file?.uri.substring(0, file.uri.lastIndexOf(`/`)) || ``
  }
}

/**
 * Useful to create archive from txt content
 */
export const createArchiveFromText = async (content: string | Blob | File, options?: {
  direction: `ltr` | `rtl`
}) => {
  const txtOpfContent = `
    <?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="ja" prefix="rendition: http://www.idpf.org/vocab/rendition/#"
      unique-identifier="ootuya-id">
      <metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:dcterms="http://purl.org/dc/terms/">
            <meta property="rendition:layout">reflowable</meta>
      </metadata>
      <manifest>
          <item id="p01" href="p01.txt" media-type="text/plain"/>
      </manifest>
      <spine page-progression-direction="${options?.direction || `ltr`}">
        <itemref idref="p01" />
      </spine>
    </package>
  `

  const archive: Archive = {
    filename: `content.txt`,
    files: [{
      dir: false,
      basename: getBasename(`generated.opf`),
      uri: `generated.opf`,
      blob: async () => new Blob([txtOpfContent]),
      string: async () => txtOpfContent,
      base64: async () => btoa(txtOpfContent),
      size: 0
    },
    {
      dir: false,
      basename: getBasename(`p01.txt`),
      uri: `p01.txt`,
      blob: async () => {
        if (typeof content === `string`) return new Blob([content])
        return content
      },
      string: async () => {
        if (typeof content === `string`) return content
        return content.text()
      },
      base64: async () => {
        if (typeof content === `string`) return btoa(content)
        return blobToBase64(content)
      },
      size: typeof content === `string` ? content.length : content.size,
      encodingFormat: `text/plain`
    }]
  }

  return archive
}

/**
 * @important
 * Make sure the urls are on the same origin or the cors header is set otherwise
 * the resource cannot be consumed as it is on the web.
 */
export const createArchiveFromUrls = async (urls: string[]): Promise<Archive> => {
  return {
    filename: ``,
    files: urls.map(url => ({
      dir: false,
      basename: getBasename(url),
      uri: url,
      size: 100 / urls.length,
      base64: async () => ``,
      blob: async () => new Blob(),
      string: async () => ``
    }))
  }
}

interface OutputByType {
  base64: string;
  string: string;
  text: string;
  binarystring: string;
  array: number[];
  uint8array: Uint8Array;
  arraybuffer: ArrayBuffer;
  blob: Blob;
  nodebuffer: Buffer;
}

type OutputType = keyof OutputByType;
interface JSZipObject {
  name: string;
  dir: boolean;
  date: Date;
  comment: string;
  unixPermissions: number | string | null;
  dosPermissions: number | null;
  async<T extends OutputType>(type: T): Promise<OutputByType[T]>;
  // nodeStream(type?: `nodebuffer`): NodeJS.ReadableStream;
  internalStream?: (type?: `uint8array`) => StreamResult
}

interface JSZip {
  files: { [key: string]: JSZipObject };
}

export const createArchiveFromJszip = async (jszip: JSZip, { orderByAlpha, name }: { orderByAlpha?: boolean, name?: string } = {}): Promise<Archive> => {
  let files = Object.values(jszip.files)

  if (orderByAlpha) {
    files = files.sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  return {
    filename: name || ``,
    files: files.map(file => ({
      dir: file.dir,
      basename: getBasename(file.name),
      uri: file.name,
      blob: () => file.async(`blob`),
      string: () => file.async(`string`),
      base64: () => file.async(`base64`),
      ...file.internalStream && {
        stream: file.internalStream
      },
      // this is private API
      // @ts-ignore
      size: file._data.uncompressedSize
    }))
  }
}

export const createArchiveFromArrayBufferList = async (
  list: {
    isDir: boolean,
    name: string,
    size: number,
    data: () => Promise<ArrayBuffer>
  }[],
  { orderByAlpha, name }: { orderByAlpha?: boolean, name?: string } = {}
): Promise<Archive> => {
  let files = list

  if (orderByAlpha) {
    files = files.sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  return {
    filename: name || ``,
    files: files.map(file => ({
      dir: file.isDir,
      basename: getBasename(file.name),
      uri: file.name,
      blob: async () => new Blob([await file.data()]),
      string: async () => {
        const data = await file.data()
        return String.fromCharCode.apply(null, Array.from(new Uint16Array(data)))
      },
      base64: async () => {
        // @todo not used for now, lets implement it later if needed
        return ``
      },
      size: file.size
    }))
  }
}

const blobToBase64 = async (blob: Blob | File) => new Promise<string>(resolve => {
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onloadend = function () {
    const base64data = reader.result as string
    resolve(base64data)
  }
})
