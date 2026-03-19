import type { Reader, ResourceHandler } from "@prose-reader/core"
import { ReactiveEntity } from "@prose-reader/core"
import type { Observable } from "rxjs"
import {
  defer,
  EMPTY,
  finalize,
  from,
  map,
  merge,
  of,
  ReplaySubject,
  Subject,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"
import type { AudioTrack } from "../types"

type TrackResource = Awaited<ReturnType<ResourceHandler["getResource"]>>

export class TrackSourceResolver extends ReactiveEntity<Record<string, never>> {
  private readonly sourceByTrackId = new Map<string, string>()
  private readonly pendingSourceByTrackId = new Map<
    string,
    Observable<string>
  >()
  private readonly cachedObjectUrlsByTrackId = new Map<string, string>()
  private readonly releaseTrackSourceSubjectByTrackId = new Map<
    string,
    Subject<void>
  >()
  private readonly cancellationSubject = new ReplaySubject<void>(1)

  constructor(
    private readonly reader: Reader,
    private readonly mountedObjectUrls: Set<string>,
  ) {
    super({})
  }

  private getReleaseTrackSourceSubject(trackId: string) {
    const releaseTrackSourceSubject =
      this.releaseTrackSourceSubjectByTrackId.get(trackId)

    if (releaseTrackSourceSubject) return releaseTrackSourceSubject

    const nextReleaseTrackSourceSubject = new Subject<void>()
    this.releaseTrackSourceSubjectByTrackId.set(
      trackId,
      nextReleaseTrackSourceSubject,
    )

    return nextReleaseTrackSourceSubject
  }

  private cacheTrackSource({
    trackId,
    source,
  }: {
    trackId: string
    source: string
  }) {
    this.sourceByTrackId.set(trackId, source)

    return source
  }

  private createCachedObjectUrl({
    trackId,
    blob,
  }: {
    trackId: string
    blob: Blob
  }) {
    const cachedObjectUrl = this.cachedObjectUrlsByTrackId.get(trackId)

    if (cachedObjectUrl) return cachedObjectUrl

    const objectUrl = URL.createObjectURL(blob)

    this.mountedObjectUrls.add(objectUrl)
    this.cachedObjectUrlsByTrackId.set(trackId, objectUrl)
    this.sourceByTrackId.set(trackId, objectUrl)

    return objectUrl
  }

  private resolveTrackSourceFromResource({
    trackId,
    trackHref,
    resource,
  }: {
    trackId: string
    trackHref: string
    resource: TrackResource
  }) {
    if (resource instanceof URL) {
      return of(
        this.cacheTrackSource({
          trackId,
          source: resource.href,
        }),
      )
    }

    if (resource instanceof Response) {
      return from(resource.blob()).pipe(
        map((blob) =>
          this.createCachedObjectUrl({
            trackId,
            blob,
          }),
        ),
      )
    }

    return of(
      this.cacheTrackSource({
        trackId,
        source: trackHref,
      }),
    )
  }

  resolveTrackSource(track: AudioTrack) {
    if (this._destroy$.closed) {
      return defer(() => of(track.href))
    }

    return defer(() => {
      const cachedSource = this.sourceByTrackId.get(track.id)

      if (cachedSource) return of(cachedSource)

      const pendingSource = this.pendingSourceByTrackId.get(track.id)

      if (pendingSource) return pendingSource

      const cancellation$ = merge(
        this.getReleaseTrackSourceSubject(track.id),
        this.cancellationSubject,
      )
      let source$: Observable<string>

      source$ = defer(() => {
        const spineItem = this.reader.spineItemsManager.get(track.index)

        if (!spineItem) {
          return EMPTY
        }

        return from(
          Promise.resolve(spineItem.resourcesHandler.getResource()),
        ).pipe(
          switchMap((resource) =>
            this.resolveTrackSourceFromResource({
              trackId: track.id,
              trackHref: track.href,
              resource,
            }),
          ),
        )
      }).pipe(
        takeUntil(cancellation$),
        finalize(() => {
          if (this.pendingSourceByTrackId.get(track.id) === source$) {
            this.pendingSourceByTrackId.delete(track.id)
          }
        }),
        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),
      )

      this.pendingSourceByTrackId.set(track.id, source$)

      return source$
    })
  }

  releaseTrackSource(trackId: string) {
    const releaseTrackSourceSubject =
      this.releaseTrackSourceSubjectByTrackId.get(trackId)
    const cachedObjectUrl = this.cachedObjectUrlsByTrackId.get(trackId)

    releaseTrackSourceSubject?.next()
    releaseTrackSourceSubject?.complete()
    this.releaseTrackSourceSubjectByTrackId.delete(trackId)
    this.sourceByTrackId.delete(trackId)
    this.pendingSourceByTrackId.delete(trackId)

    if (!cachedObjectUrl) return

    this.cachedObjectUrlsByTrackId.delete(trackId)

    if (!this.mountedObjectUrls.has(cachedObjectUrl)) return

    URL.revokeObjectURL(cachedObjectUrl)
    this.mountedObjectUrls.delete(cachedObjectUrl)
  }

  override destroy() {
    this.cancellationSubject.next()

    const trackIds = new Set([
      ...this.sourceByTrackId.keys(),
      ...this.pendingSourceByTrackId.keys(),
      ...this.cachedObjectUrlsByTrackId.keys(),
      ...this.releaseTrackSourceSubjectByTrackId.keys(),
    ])

    for (const trackId of trackIds) {
      this.releaseTrackSource(trackId)
    }

    this.cancellationSubject.complete()
    this._destroy$.next()

    super.destroy()
  }
}
