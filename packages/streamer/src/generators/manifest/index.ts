import type { Manifest } from "@prose-reader/shared"
import { Report } from "../../report"
import { Archive } from "../.."
import { epubGenerator } from "./epub"
import { comicInfoGenerator } from "./comicInfo"
import { defaultGenerator } from "./default"

const baseManifest: Manifest = {
  filename: ``,
  items: [],
  nav: {
    toc: []
  },
  readingDirection: `ltr`,
  renditionLayout: `pre-paginated`,
  renditionSpread: `auto`,
  spineItems: [],
  title: ``
}

export const getManifestFromArchive = async (archive: Archive, { baseUrl = `` }: { baseUrl?: string } = {}) => {
  const generators = [
    defaultGenerator({ archive, baseUrl }),
    epubGenerator({ archive, baseUrl }),
    comicInfoGenerator({ archive, baseUrl })
  ]

  try {
    const manifest = await generators.reduce(async (manifest, gen) => {
      return await gen(await manifest)
    }, Promise.resolve(baseManifest))

    const data = JSON.stringify(manifest)

    return new Response(data, { status: 200 })
  } catch (e) {
    Report.error(e)
    return new Response((e as any)?.message, { status: 500 })
  }
}
