import {
  detectMimeTypeFromName,
  escapeXmlAttributeValue,
} from "@prose-reader/shared"
import { createXmlSafeIdFactory } from "../utils/createXmlSafeId"
import { getUriBasename } from "../utils/uri"
import type { Archive } from "./types"

/**
 * @important
 * Make sure the urls are on the same origin or the cors header is set otherwise
 * the resource cannot be consumed as it is on the web.
 */
export const createArchiveFromUrls = async (
  urls: string[],
  options?: { useRenditionFlow: boolean },
): Promise<Archive> => {
  const createSafeId = createXmlSafeIdFactory()
  const resources = urls.map((url) => ({
    id: createSafeId(url),
    url,
  }))
  const opfFileData = `
    <?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
      <metadata>
        <meta property="rendition:layout">${options?.useRenditionFlow ? `reflowable` : `pre-paginated`}</meta>
        ${options?.useRenditionFlow ? `<meta property="rendition:flow">scrolled-continuous</meta>` : ``}
      </metadata>
      <manifest>
        ${resources
          .map(({ id, url }) => {
            const mediaType = detectMimeTypeFromName(url)

            return `<item id="${id}" href="${escapeXmlAttributeValue(url)}" media-type="${escapeXmlAttributeValue(mediaType ?? ``)}"/>`
          })
          .join(`\n`)}
      </manifest>
      <spine>
        ${resources.map(({ id }) => `<itemref idref="${id}" />`).join(`\n`)}
      </spine>
    </package>
  `

  const filesFromUrl: Archive[`records`] = urls.map((url) => ({
    dir: false,
    basename: getUriBasename(url),
    encodingFormat: detectMimeTypeFromName(url),
    uri: url,
    size: 100 / urls.length,
    blob: async () => {
      const response = await fetch(url)

      return response.blob()
    },
    string: async () => ``,
  }))

  const opfFile: Archive[`records`][number] = {
    dir: false,
    basename: `content.opf`,
    uri: `content.opf`,
    size: 0,
    blob: async () => new Blob(),
    string: async () => opfFileData,
  }

  return {
    filename: ``,
    records: [opfFile, ...filesFromUrl],
    close: () => Promise.resolve(),
  }
}
