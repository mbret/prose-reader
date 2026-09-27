/**
 * How a scenario's reader gets the resources of its book, which
 * `tests/fixtureBook.ts` sets up in the page:
 * - `http`, the default: the test app's server streams the book on the page's
 *   origin, and the reader loads each document straight from its url, as it
 *   does for an app streaming from a service worker or a server.
 * - `blob`: the page streams the book itself and hands the reader each
 *   resource as a `Response`, as the getting-started guide sets it up. The
 *   reader loads each document from a blob url and resolves its assets itself.
 *
 * Nothing here runs only in a browser or only in node: both the scenarios and
 * the specs import it.
 */
export const RESOURCE_LOADINGS = ["http", "blob"] as const

export type ResourceLoading = (typeof RESOURCE_LOADINGS)[number]

const RESOURCE_LOADING_PARAMETER = "resources"

export const getScenarioResourceLoading = (
  scenarioSearch: string,
): ResourceLoading =>
  new URLSearchParams(scenarioSearch).get(RESOURCE_LOADING_PARAMETER) === "blob"
    ? "blob"
    : "http"

/** How a test title names the way its book is loaded. */
export const describeResourceLoading = (resourceLoading: ResourceLoading) =>
  resourceLoading === "http" ? "loaded over http" : "loaded from blobs"

/** The protocol of the documents the reader loads that way. */
export const DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING: Record<
  ResourceLoading,
  string
> = { http: "http:", blob: "blob:" }

/** The scenario's url, asking for its resources to be loaded that way. */
export const withResourceLoading = (
  scenarioUrl: string,
  resourceLoading: ResourceLoading,
) => {
  const url = new URL(scenarioUrl)

  url.searchParams.set(RESOURCE_LOADING_PARAMETER, resourceLoading)

  return url.href
}
