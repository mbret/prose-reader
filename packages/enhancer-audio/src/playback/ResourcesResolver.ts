import { from, map, of } from "rxjs"
import type { AudioTrack } from "../types"

export class ResourcesResolver {
  public readonly cachedObjectUrlByTrackId = new Map<string, string>()

  public getTrackResourceUrl$ = (
    track: AudioTrack,
    resource:
      | URL
      | Response
      | {
          custom: true
          data: unknown
        },
  ) => {
    if (resource instanceof URL) {
      return of(resource.href)
    }

    if (resource instanceof Response) {
      return this.getTrackResourceUrlFromResponse$({
        trackId: track.id,
        resource,
      })
    }

    return of(track.href)
  }

  private getTrackResourceUrlFromResponse$({
    trackId,
    resource,
  }: {
    trackId: string
    resource: Response
  }) {
    const cachedObjectUrl = this.cachedObjectUrlByTrackId.get(trackId)

    if (cachedObjectUrl) {
      return of(cachedObjectUrl)
    }

    return from(resource.blob()).pipe(
      map((blob) => {
        const objectUrl = URL.createObjectURL(blob)

        this.cachedObjectUrlByTrackId.set(trackId, objectUrl)

        return objectUrl
      }),
    )
  }
}
