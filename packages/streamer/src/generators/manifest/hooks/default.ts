import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "../../../archives/types"
import { createXmlSafeIdFactory } from "../../../utils/createXmlSafeId"
import { createManifestResourceHref } from "../createManifestResourceHref"

export const defaultHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (): Promise<Manifest> => {
    const files = archive.records.filter((file) => !file.dir)
    const createSafeId = createXmlSafeIdFactory()
    const filesWithIds = files.map((file) => ({
      file,
      id: createSafeId(file.uri),
    }))

    return {
      filename: archive.filename ?? ``,
      title:
        archive.records.find(({ dir }) => dir)?.basename.replace(/\/$/, ``) ||
        archive.filename ||
        ``,
      renditionLayout: undefined,
      renditionSpread: `auto`,
      readingDirection: undefined,
      spineItems: filesWithIds
        .filter(({ file }) => !file.basename.endsWith(`.db`))
        .map(({ file, id }, index) => {
          return {
            id,
            index,
            href: createManifestResourceHref({
              baseUrl,
              resourcePath: file.uri,
            }),
            renditionLayout: undefined,
            progressionWeight: 1 / files.length,
            pageSpreadLeft: undefined,
            pageSpreadRight: undefined,
            mediaType: file.encodingFormat,
          }
        }),
      items: filesWithIds.map(({ file, id }) => ({
        id,
        href: encodeURI(`${baseUrl}${file.uri}`),
      })),
    }
  }
