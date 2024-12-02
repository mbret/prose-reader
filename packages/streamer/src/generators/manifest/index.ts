import { Report } from "../../report"
import { Archive } from "../../archives/types"
import { defaultHook } from "./hooks/default"
import { epubHook } from "./hooks/epub/epub"
import { comicInfoHook } from "./hooks/comicInfo"
import { epubOptimizerHook } from "./hooks/epubOptimizer"
import { navigationFallbackHook } from "./hooks/navigationFallback"
import { kobo } from "./hooks/kobo"
import { nonEpub } from "./hooks/nonEpub"
import { apple } from "./hooks/apple"

export const generateManifestFromArchive = async (
  archive: Archive,
  { baseUrl = `` }: { baseUrl?: string } = {},
) => {
  const hooks = [
    epubHook({ archive, baseUrl }),
    kobo({ archive, baseUrl }),
    apple({ archive, baseUrl }),
    nonEpub({ archive, baseUrl }),
    epubOptimizerHook({ archive, baseUrl }),
    comicInfoHook({ archive, baseUrl }),
    navigationFallbackHook({ archive, baseUrl }),
  ]

  try {
    const baseManifestPromise = defaultHook({ archive, baseUrl })()

    const manifest = await hooks.reduce(async (manifest, gen) => {
      return await gen(await manifest)
    }, baseManifestPromise)

    Report.log("Generated manifest", manifest)

    return manifest
  } catch (e) {
    Report.error(e)

    throw e
  }
}
