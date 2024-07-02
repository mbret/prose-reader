import type { Manifest } from "@prose-reader/shared"
import { Report } from "../../report"
import { Archive } from "../../archives/types"
import { defaultHook } from "./hooks/default"
import { epubHook } from "./hooks/epub"
import { comicInfoHook } from "./hooks/comicInfo"
import { epubOptimizerHook } from "./hooks/epubOptimizer"
import { navigationFallbackHook } from "./hooks/navigationFallback"

const baseManifest: Manifest = {
  filename: ``,
  items: [],
  nav: {
    toc: [],
  },
  readingDirection: `ltr`,
  renditionLayout: `pre-paginated`,
  renditionSpread: `auto`,
  spineItems: [],
  title: ``,
}

export const generateManifestFromArchive = async (
  archive: Archive,
  { baseUrl = `` }: { baseUrl?: string } = {},
) => {
  const hooks = [
    defaultHook({ archive, baseUrl }),
    epubHook({ archive, baseUrl }),
    epubOptimizerHook({ archive, baseUrl }),
    comicInfoHook({ archive, baseUrl }),
    navigationFallbackHook({ archive, baseUrl }),
  ]

  try {
    const manifest = await hooks.reduce(async (manifest, gen) => {
      return await gen(await manifest)
    }, Promise.resolve(baseManifest))

    Report.log("Generated manifest", manifest)

    return manifest
  } catch (e) {
    Report.error(e)

    throw e
  }
}
