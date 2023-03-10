import { PROSE_READER_RESOURCE_ERROR_INJECTED_META_NAME } from "@prose-reader/shared"
import { Archive } from "../.."
import { Report } from "../../report"
import { calibreFixHook } from "./hooks/calibreFixHook"
import { cssFixHook } from "./hooks/cssFixHook"
import { defaultHook } from "./hooks/defaultHook"
import { HookResource } from "./hooks/types"

export const generateResourceFromArchive = async (archive: Archive, resourcePath: string) => {
  const file = Object.values(archive.files).find((file) => file.uri === resourcePath)

  if (!file) {
    throw new Error(`no file found`)
  }

  const defaultResource: HookResource = {
    params: {
      status: 200,
    },
  }

  const hooks = [
    defaultHook({ archive, resourcePath }),
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
      body: resource.body || (await file.blob()),
    }
  } catch (e) {
    Report.error(e)

    throw e
  }
}

export const generateResourceFromError = (error: unknown) => {
  return {
    body: `
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
      <head>
        <meta name="${PROSE_READER_RESOURCE_ERROR_INJECTED_META_NAME}" content="${String(error)}" />
      </head>
      <body>
        <pre>${String(error)}</pre>
      </body>
    </html>
    `,
    params: {
      status: 500,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    },
  }
}

// (() => {
//   fetch("https://miro.medium.com/fit/c/64/64/1*dmbNkD5D-u45r44go_cf0g.png").then(async (response) => {
//     console.log("asdasd")
//     const s = await response.text()
//     console.log(s)
//     debugger
//   }).catch(console.error)
// })()
