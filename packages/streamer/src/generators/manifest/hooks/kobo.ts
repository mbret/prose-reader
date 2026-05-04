import {
  KOBO_DISPLAY_OPTIONS_FILENAME,
  type KoboMetadata,
  parseKoboXml,
  resolveArchiveMetadata,
} from "@prose-reader/archive-parser"
import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "../../../archives/types"

const extractKoboInformationFromArchive = async (
  archive: Archive,
): Promise<KoboMetadata> => {
  let renditionLayout: KoboMetadata["renditionLayout"]

  await Promise.all(
    archive.records.map(async (file) => {
      if (file.dir || !file.uri.endsWith(KOBO_DISPLAY_OPTIONS_FILENAME)) return
      const { renditionLayout: layout } = parseKoboXml(await file.string())
      if (layout) renditionLayout = layout
    }),
  )

  return {
    kind: `kobo`,
    ...(renditionLayout !== undefined ? { renditionLayout } : {}),
  }
}

export const kobo =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const koboMeta = await extractKoboInformationFromArchive(archive)
    const { renditionLayout } = resolveArchiveMetadata(koboMeta)

    return {
      ...manifest,
      renditionLayout: manifest.renditionLayout ?? renditionLayout,
    }
  }
