import type { Archive } from "../../archives/types"
import { Report } from "../../report"
import { apple } from "./hooks/apple"
import { comicInfoHook } from "./hooks/comicInfo"
import { defaultHook } from "./hooks/default"
import { epubHook } from "./hooks/epub/epub"
import { epubOptimizerHook } from "./hooks/epubOptimizer"
import { kobo } from "./hooks/kobo"
import { nonEpub } from "./hooks/nonEpub"
import { tocHook } from "./hooks/toc"

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
    tocHook({ archive, baseUrl }),
  ]

  try {
    const baseManifestPromise = defaultHook({ archive, baseUrl })()

    const manifest = await hooks.reduce(async (manifest, gen) => {
      return await gen(await manifest)
    }, baseManifestPromise)

    Report.log("Generated manifest", manifest)

    if (process.env.NODE_ENV === "development") {
      if (Report.isEnabled()) {
        const manifestStr = JSON.stringify(manifest, null, 2)
        Report.groupCollapsed(...Report.getGroupArgs("Generated manifest"))
        Report.log(`\n${manifestStr}`)
        Report.groupEnd()
      }
    }

    return manifest
  } catch (e) {
    Report.error(e)

    throw e
  }
}
