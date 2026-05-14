import type { Archive } from "../.."
import type { StreamerResourceHookFactory } from "../../hooks"
import { Report } from "../../report"
import { calibreFixHook } from "./hooks/calibreFixHook"
import { cssFixHook } from "./hooks/cssFixHook"
import { defaultHook } from "./hooks/defaultHook"
import { selfClosingTagsFixHook } from "./hooks/selfClosingTagsFixHook"
import type { HookResource } from "./hooks/types"

/**
 * Builds one streamed asset from `archive` (hot path: typically once per
 * fetched file in the reader).
 *
 * **OPF limitation:** Unlike manifest generation, this API does not take
 * `ArchiveOpfParsed`. `defaultHook` calls `readArchiveOpf(archive)` to resolve
 * `media-type` from the package document, so EPUBs repeat OPF I/O + parse per
 * resource. Usually fine (small OPF); if profiling shows regressions, address
 * explicitly—e.g. optional `archiveOpf` (or equivalent) threaded from
 * `Streamer.fetchResource` / manifest, or an opt-in cache on `Archive` wired at
 * construction time—rather than hidden process-wide memoization.
 */
export const generateResourceFromArchive = async (
  archive: Archive,
  resourcePath: string,
  { hooks = [] }: { hooks?: StreamerResourceHookFactory[] } = {},
) => {
  const defaultResource: HookResource = {
    params: {},
  }
  const externalHooks = hooks.map((hook) => hook({ archive, resourcePath }))

  /**
   * EPUB: `defaultHook` calls `readArchiveOpf` → repeated OPF I/O + parse per
   * resource until we thread `ArchiveOpfParsed` here (see export JSDoc).
   */
  const resourceHooks = [
    ...externalHooks,
    defaultHook({ archive, resourcePath }),
    selfClosingTagsFixHook({ archive, resourcePath }),
    cssFixHook({ archive, resourcePath }),
    calibreFixHook({ archive, resourcePath }),
  ]

  try {
    const resource = await resourceHooks.reduce(async (manifest, gen) => {
      return await gen(await manifest)
    }, Promise.resolve(defaultResource))

    Report.log("Generated resource", resourcePath, resource)

    if (resource.body !== undefined) {
      return resource
    }

    const file = Object.values(archive.records).find(
      (file) => file.uri === resourcePath && !file.dir,
    )

    if (!file || file.dir) {
      throw new Error(`no file found for resourcePath:${resourcePath}`)
    }

    return {
      ...resource,
      body: await file.blob(),
    }
  } catch (e) {
    Report.error(e)

    throw e
  }
}
