import { Manifest } from "@prose-reader/shared"
import { Archive } from "../../../archives/types"
import { extractKoboInformationFromArchive } from "../../../parsers/kobo"

/**
 * Handle archive which contains ComicInfo.xml. This is a meta file
 * used to define cbz, etc. I believe it comes from some sites or apps.
 */
export const comicInfoHook =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const koboInformation = await extractKoboInformationFromArchive(archive)

    return {
      ...manifest,
      renditionLayout:
        manifest.renditionLayout ?? koboInformation.renditionLayout,
    }
  }
