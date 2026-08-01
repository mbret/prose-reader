import { join } from "node:path"
import type { Express } from "express"

/** The page sits next to this module: one route, one file, no bundler. */
export const PLAYGROUND_FILE = join(import.meta.dirname, "playground.html")

/**
 * Mounts the development playground at `/`: a form that runs a lookup and
 * shows each candidate with the signals behind its score.
 *
 * `createApp` calls this only when the playground is enabled — never in
 * production (see `config.ts`), where the route simply does not exist.
 *
 * Served from disk per request, deliberately: editing the page then shows up
 * on a refresh, since `node --watch` only watches modules it imported.
 */
export const registerPlayground = (app: Express): void => {
  app.get("/", (_request, response, next) => {
    response.sendFile(PLAYGROUND_FILE, (error) => {
      if (error) next(error)
    })
  })
}
