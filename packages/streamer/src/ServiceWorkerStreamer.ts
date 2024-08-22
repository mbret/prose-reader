import { Streamer } from "./Streamer"
import { removeTrailingSlash } from "./utils/uri"

type ConflictFreeWebWorkerFetchEvent = {
  readonly request: Request
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/FetchEvent/respondWith) */
  respondWith(r: Response | PromiseLike<Response>): void
}

export class ServiceWorkerStreamer extends Streamer {
  protected getUriInfo: (event: ConflictFreeWebWorkerFetchEvent) =>
    | {
        baseUrl: string
      }
    | undefined

  constructor({
    getUriInfo,
    ...rest
  }: ConstructorParameters<typeof Streamer>[0] & {
    getUriInfo: (event: ConflictFreeWebWorkerFetchEvent) =>
      | {
          baseUrl: string
        }
      | undefined
  }) {
    super(rest)

    this.getUriInfo = getUriInfo
    this.fetchEventListener = this.fetchEventListener.bind(this)
  }

  fetchEventListener(event: ConflictFreeWebWorkerFetchEvent) {
    try {
      const uriInfo = this.getUriInfo(event)

      if (!uriInfo) return

      const baseUrl = removeTrailingSlash(uriInfo.baseUrl)
      const streamerPath = event.request.url.substring(
        baseUrl.length + `/`.length,
      )
      const [key = ``] = streamerPath.split("/")
      const resourcePath = removeTrailingSlash(
        streamerPath.substring(key.length + `/`.length),
      )

      if (streamerPath.endsWith(`/manifest`)) {
        event.respondWith(
          this.fetchManifest({ key, baseUrl: `${baseUrl}/${key}/` }),
        )
      } else {
        event.respondWith(this.fetchResource({ key, resourcePath }))
      }
    } catch (e) {
      event.respondWith(new Response(String(e), { status: 500 }))
    }
  }
}
