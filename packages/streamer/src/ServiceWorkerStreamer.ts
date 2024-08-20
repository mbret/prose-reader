import { createArchiveLoader } from "./archives/archiveLoader"
import { Streamer } from "./Streamer"

type ConflictFreeWebWorkerFetchEvent = {
  readonly request: Request
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/FetchEvent/respondWith) */
  respondWith(r: Response | PromiseLike<Response>): void
}

const extractKey = (path: string) => {
  const nextSlashIndex = path.indexOf("/")

  if (nextSlashIndex !== -1) {
    return path.substring(0, path.indexOf("/"))
  }

  return path
}

export class ServiceWorkerStreamer extends Streamer {
  protected getStreamerUri: (
    event: ConflictFreeWebWorkerFetchEvent,
  ) => string | undefined

  constructor({
    getStreamerUri,
    ...rest
  }: Parameters<typeof createArchiveLoader>[0] & {
    getStreamerUri: (
      event: ConflictFreeWebWorkerFetchEvent,
    ) => string | undefined
  }) {
    super(rest)

    this.getStreamerUri = getStreamerUri
    this.fetchEventListener = this.fetchEventListener.bind(this)
  }

  fetchEventListener(event: ConflictFreeWebWorkerFetchEvent) {
    try {
      const url = new URL(event.request.url)

      const streamerUri = this.getStreamerUri(event)
      const streamerUriWithPreSlash = `/${streamerUri}`

      if (!streamerUri) return

      const key = extractKey(streamerUri)
      const baseUrl = url.href.substring(
        0,
        url.href.length - streamerUriWithPreSlash.length,
      )
      const streamerBaseUrl = `${baseUrl}/${key}/`

      if (streamerUri.endsWith(`/manifest`)) {
        event.respondWith(this.fetchManifest({ key, baseUrl: streamerBaseUrl }))
      } else {
        const resourcePath = streamerUri.substring(
          key.length + `/`.length,
          streamerUri.length,
        )

        event.respondWith(this.fetchResource({ key, resourcePath }))
      }
    } catch (e) {
      event.respondWith(new Response(String(e), { status: 500 }))
    }
  }
}
