import { join } from "node:path"
import express, { type Express } from "express"

export const PLAYGROUND_FILE = join(import.meta.dirname, "playground.html")
export const PLAYGROUND_SCRIPT_FILE = join(import.meta.dirname, "playground.js")

const decodedHeader = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined

  try {
    const decoded = decodeURIComponent(value).trim()

    return decoded.length > 0 ? decoded : undefined
  } catch {
    return undefined
  }
}

/**
 * Mounts the development playground at `/`: a form that runs a lookup and
 * shows each candidate with the signals behind its score.
 *
 * `createApp` calls this only when the playground is enabled — never in
 * production (see `config.ts`), where the route simply does not exist.
 *
 * Both assets are served from disk per request, deliberately: editing either
 * then shows up on refresh, since `node --watch` only watches imported modules.
 */
export const registerPlayground = (app: Express): void => {
  app.get("/", (_request, response, next) => {
    response.sendFile(PLAYGROUND_FILE, (error) => {
      if (error) next(error)
    })
  })

  app.get("/playground/playground.js", (_request, response, next) => {
    response.sendFile(PLAYGROUND_SCRIPT_FILE, (error) => {
      if (error) next(error)
    })
  })

  app.post(
    "/playground/resolve",
    express.raw({
      type: "application/octet-stream",
      // The development playground intentionally keeps the publication only
      // in process memory, with no application-level size restriction or
      // fallback to temporary storage.
      limit: Number.POSITIVE_INFINITY,
    }),
    async (request, response) => {
      const filename = decodedHeader(request.get("x-prose-file-name"))

      if (filename === undefined) {
        response
          .status(400)
          .json({ error: "A publication filename is required" })

        return
      }

      if (!Buffer.isBuffer(request.body) || request.body.byteLength === 0) {
        response.status(400).json({ error: "A publication file is required" })

        return
      }

      const encodingFormat = decodedHeader(request.get("x-prose-file-type"))

      try {
        // The resolver and zip.js only load when the development-only route is
        // actually used. Hosted deployments neither register this route nor
        // carry the optional playground dependency after pruning dev packages.
        const { resolveUploadedArchive } = await import(
          "./resolveUploadedArchive.ts"
        )
        const metadata = await resolveUploadedArchive(request.body, {
          filename,
          ...(encodingFormat !== undefined ? { encodingFormat } : {}),
        })

        response.json(metadata)
      } catch (error) {
        const detail = error instanceof Error ? `: ${error.message}` : ""

        response.status(400).json({
          error: `Could not read ${filename} as a ZIP-based publication${detail}`,
        })
      }
    },
  )
}
