import type { Archive } from "../.."
import { Report } from "../../report"
import { calibreFixHook } from "./hooks/calibreFixHook"
import { cssFixHook } from "./hooks/cssFixHook"
import { defaultHook } from "./hooks/defaultHook"
import { selfClosingTagsFixHook } from "./hooks/selfClosingTagsFixHook"
import type { HookResource } from "./hooks/types"

export const generateResourceFromArchive = async (
  archive: Archive,
  resourcePath: string,
) => {
  const file = Object.values(archive.records).find(
    (file) => file.uri === resourcePath && !file.dir,
  )

  if (!file || file.dir) {
    throw new Error(`no file found`)
  }

  const defaultResource: HookResource = {
    params: {},
  }

  const hooks = [
    defaultHook({ archive, resourcePath }),
    selfClosingTagsFixHook({ archive, resourcePath }),
    cssFixHook({ archive, resourcePath }),
    calibreFixHook({ archive, resourcePath }),
  ]

  try {
    const resource = await hooks.reduce(async (manifest, gen) => {
      return await gen(await manifest)
    }, Promise.resolve(defaultResource))

    Report.log("Generated resource", resourcePath, resource)

    return {
      ...resource,
      body: resource.body ?? (await file.blob()),
    }
  } catch (e) {
    Report.error(e)

    throw e
  }
}
