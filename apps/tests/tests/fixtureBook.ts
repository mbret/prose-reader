import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import type { CreateReaderOptions } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"
import { getScenarioResourceLoading } from "./utils/resourceLoading"

/**
 * The manifest of a book the test app serves, a file of `public/epubs` or a
 * book rewritten from one (see `server/serveBooks.ts`), and the `getResource`
 * its reader needs, for the resource loading the scenario's project asks for
 * (see `utils/resourceLoading.ts`). Pass both to the reader as they are.
 */
export const openFixtureBook = async (
  bookName: string,
): Promise<Pick<CreateReaderOptions, "manifest" | "getResource">> => {
  if (getScenarioResourceLoading() === "http") {
    const manifestResponse = await fetch(
      `/streamer/${encodeURIComponent(bookName)}/manifest`,
    )

    return { manifest: await manifestResponse.json() }
  }

  const streamer = new Streamer({
    getArchive: async () => {
      const bookResponse = await fetch(`/epubs/${encodeURIComponent(bookName)}`)

      return createArchiveFromJszip(await loadAsync(await bookResponse.blob()))
    },
  })
  const manifestResponse = await streamer.fetchManifest()

  return {
    manifest: await manifestResponse.json(),
    getResource: (item) =>
      from(streamer.fetchResource({ resourcePath: item.href })),
  }
}
