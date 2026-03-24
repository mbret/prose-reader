import type { ResourceHandler } from "@prose-reader/core"
import { from, map, of, switchMap } from "rxjs"
import type { AudioTrack } from "../types"

type CachedTrackSource = {
  url: string
  release?: () => void
}

export class ResourcesResolver {
  private readonly cachedSourceByTrackId = new Map<string, CachedTrackSource>()

  public hasCachedSource(trackId: string): boolean {
    return this.cachedSourceByTrackId.has(trackId)
  }

  public getTrackResourceUrl$ = (
    track: AudioTrack,
    resourcesHandler: Pick<ResourceHandler, "getResource">,
  ) => {
    const cachedSource = this.cachedSourceByTrackId.get(track.id)

    if (cachedSource) {
      return of(cachedSource.url)
    }

    const resource$ = from(resourcesHandler.getResource())

    return resource$.pipe(
      switchMap((resource) => {
        if (resource instanceof URL) {
          this.cachedSourceByTrackId.set(track.id, {
            url: resource.href,
          })

          return of(resource.href)
        }

        if (resource instanceof Response) {
          return from(resource.blob()).pipe(
            map((blob) => {
              const objectUrl = URL.createObjectURL(blob)

              this.cachedSourceByTrackId.set(track.id, {
                url: objectUrl,
                release: () => {
                  URL.revokeObjectURL(objectUrl)
                },
              })

              return objectUrl
            }),
          )
        }

        this.cachedSourceByTrackId.set(track.id, {
          url: track.href,
        })

        return of(track.href)
      }),
    )
  }

  public releaseTrackSource(trackId: string) {
    const cachedSource = this.cachedSourceByTrackId.get(trackId)

    if (!cachedSource) return

    this.cachedSourceByTrackId.delete(trackId)
    cachedSource.release?.()
  }

  public releaseAll() {
    for (const trackId of this.cachedSourceByTrackId.keys()) {
      this.releaseTrackSource(trackId)
    }
  }

  public destroy() {
    this.releaseAll()
  }
}
