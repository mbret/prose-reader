import type { Archive } from "@prose-reader/archive-reader"
import { resolveArchive } from "@prose-reader/archive-reader"
import type { StreamerManifestHookFactory } from "../../hooks"
import { Report } from "../../report"
import { manifestFromResolvedArchive } from "./manifestFromResolvedArchive"

const normalizeBaseUrl = (baseUrl: string | undefined) => {
  if (!baseUrl) return ``

  return baseUrl.endsWith(`/`) ? baseUrl : `${baseUrl}/`
}

/**
 * Generates the prose `Manifest` for an archive: `resolveArchive` does the
 * book understanding (metadata precedence, reading order, toc, the viewport
 * layout scan), then the result is mapped into serving space and handed to
 * the consumer `hooks` (ordered `Manifest` transforms). The final defaults
 * (`readingDirection` falling back to `ltr`) apply after the hooks, so a
 * hook can still observe "no source decided it".
 */
export const generateManifestFromArchive = async (
  archive: Archive,
  {
    baseUrl = ``,
    hooks = [],
  }: { baseUrl?: string; hooks?: StreamerManifestHookFactory[] } = {},
) => {
  Report.log("Generating manifest from archive", archive)

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  try {
    const resolved = await resolveArchive(archive, {
      include: [`metadata`, `readingOrder`, `toc`, `sources`],
      layoutScan: true,
    })

    let manifest = manifestFromResolvedArchive({
      archive,
      baseUrl: normalizedBaseUrl,
      resolved,
    })

    for (const hookFactory of hooks) {
      manifest = await hookFactory({
        archive,
        baseUrl: normalizedBaseUrl,
      })(manifest)
    }

    manifest = {
      ...manifest,
      readingDirection: manifest.readingDirection ?? "ltr",
    }

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
