import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import type { CreateReaderOptions } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"
import { getScenarioResourceLoading } from "./utils/resourceLoading"

/**
 * The manifest of a book in `public/epubs`, and the `getResource` its reader
 * needs, for the resource loading the scenario's url asks for (see
 * `utils/resourceLoading.ts`). Pass both to the reader as they are.
 */
export const openFixtureBook = async (
  file: string,
): Promise<Pick<CreateReaderOptions, "manifest" | "getResource">> => {
  if (getScenarioResourceLoading(window.location.search) === "http") {
    const manifestResponse = await fetch(
      `/streamer/${encodeURIComponent(file)}/manifest`,
    )

    return { manifest: await manifestResponse.json() }
  }

  const streamer = new Streamer({
    getArchive: async () => {
      const bookResponse = await fetch(`/epubs/${encodeURIComponent(file)}`)

      return createArchiveFromJszip(await loadAsync(await bookResponse.blob()))
    },
  })
  const manifestResponse = await streamer.fetchManifest({ key: file })

  return {
    manifest: await manifestResponse.json(),
    getResource: (item) =>
      from(streamer.fetchResource({ key: file, resourcePath: item.href })),
  }
}
