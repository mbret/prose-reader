import { Manifest } from "@prose-reader/shared"
import { Archive } from "../../../archives/types"

export const defaultHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const files = Object.values(archive.files).filter((file) => !file.dir)

    return {
      filename: archive.filename,
      nav: {
        toc: []
      },
      title: archive.files.find(({ dir }) => dir)?.basename.replace(/\/$/, ``) || ``,
      renditionLayout: `pre-paginated`,
      renditionSpread: `auto`,
      readingDirection: `ltr`,
      spineItems: files.map((file) => ({
        id: file.basename,
        href: `${baseUrl}${file.uri}`,
        renditionLayout: `pre-paginated`,
        progressionWeight: 1 / files.length,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        mediaType: file.encodingFormat
      })),
      items: files.map((file) => ({
        id: file.basename,
        href: `${baseUrl}${file.uri}`
      }))
    }
  }
