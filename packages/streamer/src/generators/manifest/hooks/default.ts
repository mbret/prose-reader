import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "../../../archives/types"

export const defaultHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (): Promise<Manifest> => {
    const files = Object.values(archive.records).filter((file) => !file.dir)

    return {
      filename: archive.filename,
      title:
        archive.records.find(({ dir }) => dir)?.basename.replace(/\/$/, ``) ||
        archive.filename,
      renditionLayout: undefined,
      renditionSpread: `auto`,
      readingDirection: `ltr`,
      spineItems: files
        .filter((file) => !file.basename.endsWith(`.db`))
        .map((file, index) => {
          const hrefBaseUri = baseUrl
            ? baseUrl
            : /^https?:\/\//.test(file.uri)
              ? ""
              : "file://"

          return {
            // some books such as cbz can have same basename inside different sub folder
            // we need to make sure to have unique index
            // /chap01/01.png, /chap02/01.png, etc
            id: `${index}.${file.basename}`,
            index,
            href: encodeURI(`${hrefBaseUri}${file.uri}`),
            renditionLayout: undefined,
            progressionWeight: 1 / files.length,
            pageSpreadLeft: undefined,
            pageSpreadRight: undefined,
            mediaType: file.encodingFormat,
          }
        }),
      items: files.map((file, index) => ({
        id: `${index}.${file.basename}`,
        href: encodeURI(`${baseUrl}${file.uri}`),
      })),
    }
  }
