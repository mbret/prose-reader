import type { Archive } from "../../archives/types"
import { readArchiveOpf } from "../../epubs/readArchiveOpf"
import type { StreamerManifestHooks } from "../../hooks"
import { Report } from "../../report"
import { apple } from "./hooks/apple"
import { comicInfo } from "./hooks/comicInfo"
import { defaultHook } from "./hooks/default"
import { epubHook } from "./hooks/epub/epub"
import { epubOptimizerHook } from "./hooks/epubOptimizer"
import { finalDefaultsHook } from "./hooks/finalDefaults"
import { kobo } from "./hooks/kobo"
import { nonEpub } from "./hooks/nonEpub"
import { tocHook } from "./hooks/toc"

const normalizeBaseUrl = (baseUrl: string | undefined) => {
  if (!baseUrl) return ``

  return baseUrl.endsWith(`/`) ? baseUrl : `${baseUrl}/`
}

export const generateManifestFromArchive = async (
  archive: Archive,
  {
    baseUrl = ``,
    hooks = {},
  }: { baseUrl?: string; hooks?: StreamerManifestHooks } = {},
) => {
  Report.log("Generating manifest from archive", archive)

  const archiveOpf = await readArchiveOpf(archive)
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const createExternalHooks = (
    hookFactories: StreamerManifestHooks[keyof StreamerManifestHooks],
  ) =>
    (hookFactories ?? []).map((hook) =>
      hook({ archive, baseUrl: normalizedBaseUrl }),
    )

  const contentHooks = [
    epubHook({ archive, baseUrl: normalizedBaseUrl, archiveOpf }),
    comicInfo({ archive, baseUrl: normalizedBaseUrl }),
    apple({ archive, baseUrl: normalizedBaseUrl }),
    nonEpub({ archive, baseUrl: normalizedBaseUrl }),
    ...createExternalHooks(hooks.content),
  ]
  const spineHooks = createExternalHooks(hooks.spine)
  const presentationHooks = [
    epubOptimizerHook({ archive, baseUrl: normalizedBaseUrl, archiveOpf }),
    kobo({ archive, baseUrl: normalizedBaseUrl }),
    ...createExternalHooks(hooks.presentation),
  ]
  const navigationHooks = [
    tocHook({ archive, baseUrl: normalizedBaseUrl, archiveOpf }),
    ...createExternalHooks(hooks.navigation),
  ]
  const manifestHooks = [
    ...contentHooks,
    ...spineHooks,
    ...presentationHooks,
    ...navigationHooks,
    finalDefaultsHook(),
  ]

  try {
    const baseManifestPromise = defaultHook({
      archive,
      baseUrl: normalizedBaseUrl,
    })()

    const manifest = await manifestHooks.reduce(async (manifest, gen) => {
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
