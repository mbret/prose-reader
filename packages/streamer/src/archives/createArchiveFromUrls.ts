import { getUriBasename } from "../utils/uri"
import { Archive } from "./types"

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
      basename: getUriBasename(url),
      uri: url,
      size: 100 / urls.length,
      base64: async () => ``,
      blob: async () => new Blob(),
      string: async () => ``
    }))
  }
}
