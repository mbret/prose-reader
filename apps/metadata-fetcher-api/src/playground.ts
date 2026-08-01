import { join } from "node:path"

/**
 * Absolute path to the development playground page — a single self-contained
 * HTML file next to this module (no bundler, no assets, nothing to build).
 *
 * It is served **only** when `NODE_ENV` is not `production` (see `config.ts`),
 * and the route is registered conditionally rather than guarded per request,
 * so a hosted deployment has no HTML surface at all: `/` is a plain 404 there.
 *
 * Served straight from disk on every request, deliberately: editing the page
 * then shows up on a refresh, with no restart — `node --watch` only watches
 * modules it imported, and an HTML file read at runtime is not one of them.
 */
export const PLAYGROUND_FILE = join(import.meta.dirname, "playground.html")
