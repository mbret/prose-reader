import { join } from "node:path"
import type { Express } from "express"

/**
 * Absolute path to the playground page, which sits next to this module — the
 * whole feature is this folder: one route, one self-contained HTML file, no
 * bundler and no assets.
 */
export const PLAYGROUND_FILE = join(import.meta.dirname, "playground.html")

/**
 * Mounts the development playground at `/`: a form that runs a lookup and
 * shows what came back — each candidate with its score and the per-field
 * signals behind it.
 *
 * `createApp` calls this **only** when the playground is enabled (never in
 * production, see `config.ts`), so a hosted deployment has no HTML surface at
 * all: the route does not exist there, rather than existing behind a check.
 *
 * The page is served straight from disk on every request, deliberately:
 * editing it then shows up on a refresh, with no restart — `node --watch` only
 * watches modules it imported, and an HTML file read at runtime is not one.
 */
export const registerPlayground = (app: Express): void => {
  app.get("/", (_request, response, next) => {
    response.sendFile(PLAYGROUND_FILE, (error) => {
      if (error) next(error)
    })
  })
}
