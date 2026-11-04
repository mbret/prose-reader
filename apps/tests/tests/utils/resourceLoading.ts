/**
 * How a scenario's reader gets the resources of its book, which
 * `tests/fixtureBook.ts` sets up in the page:
 * - `http`: the test app's server streams the book on the page's origin, and
 *   the reader loads each document straight from its url, as it does for an
 *   app streaming from a service worker or a server.
 * - `blob`: the page streams the book itself and hands the reader each
 *   resource as a `Response`, as the getting-started guide sets it up. The
 *   reader loads each document from a blob url and resolves its assets itself.
 *
 * It belongs to the Playwright project, not to a spec: each project starts its
 * pages with it in `localStorage` (see `playwright.config.ts`). A book renders
 * and behaves the same either way, so a spec never asks which one it runs.
 *
 * Nothing here runs only in a browser or only in node: both the scenarios and
 * the config import it.
 */
export const RESOURCE_LOADINGS = ["http", "blob"] as const

export type ResourceLoading = (typeof RESOURCE_LOADINGS)[number]

export const isResourceLoading = (value: unknown): value is ResourceLoading =>
  RESOURCE_LOADINGS.some((resourceLoading) => resourceLoading === value)

const RESOURCE_LOADING_STORAGE_KEY = "prose-reader-tests:resourceLoading"

/**
 * The storage state a Playwright project starts its pages with, so that every
 * scenario served from `origin` loads its book that way.
 */
export const createResourceLoadingStorageState = (
  origin: string,
  resourceLoading: ResourceLoading,
) => ({
  cookies: [],
  origins: [
    {
      origin,
      localStorage: [
        { name: RESOURCE_LOADING_STORAGE_KEY, value: resourceLoading },
      ],
    },
  ],
})

/**
 * The way the scenario open in this page loads its book: the one its project
 * stored, or `http` for a scenario opened by hand.
 */
export const getScenarioResourceLoading = (): ResourceLoading => {
  const storedResourceLoading = localStorage.getItem(
    RESOURCE_LOADING_STORAGE_KEY,
  )

  if (storedResourceLoading === null) return "http"

  if (!isResourceLoading(storedResourceLoading)) {
    throw new Error(
      `"${storedResourceLoading}" is not a resource loading: expected one of ${RESOURCE_LOADINGS.join(", ")}`,
    )
  }

  return storedResourceLoading
}

/** The protocol of the documents the reader loads that way. */
export const DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING: Record<
  ResourceLoading,
  string
> = { http: "http:", blob: "blob:" }
