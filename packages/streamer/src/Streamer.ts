import {
  catchError,
  finalize,
  from,
  lastValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
} from "rxjs"
import { createArchiveLoader } from "./archives/archiveLoader"
import { Manifest } from "@prose-reader/shared"
import { generateManifestFromArchive } from "./generators/manifest"
import { generateResourceFromArchive } from "./generators/resources"
import { Archive } from "./archives/types"

type OnError = (error: unknown) => Response
type OnManifestSuccess = (params: {
  manifest: Manifest
  archive: Archive
}) => Observable<Manifest> | Promise<Manifest>

export class Streamer {
  epubLoader: ReturnType<typeof createArchiveLoader>
  onError: OnError = (error) => {
    return new Response(String(error), { status: 500 })
  }
  onManifestSuccess: OnManifestSuccess

  constructor({
    onError,
    onManifestSuccess,
    ...rest
  }: Parameters<typeof createArchiveLoader>[0] & {
    onError?: OnError
    onManifestSuccess?: OnManifestSuccess
  }) {
    this.epubLoader = createArchiveLoader(rest)

    this.onManifestSuccess =
      onManifestSuccess ?? (({ manifest }) => Promise.resolve(manifest))
    this.onError = onError ?? this.onError
  }

  public fetchManifest({ key, baseUrl }: { key: string; baseUrl?: string }) {
    const response$ = this.epubLoader.access(key).pipe(
      mergeMap(({ archive, release }) => {
        const manifest$ = from(
          generateManifestFromArchive(archive, { baseUrl }),
        )

        return manifest$.pipe(
          switchMap((manifest) =>
            from(this.onManifestSuccess({ manifest, archive })),
          ),
          map(
            (manifest) =>
              new Response(JSON.stringify(manifest satisfies Manifest), {
                status: 200,
              }),
          ),
          finalize(() => {
            release()
          }),
        )
      }),
      catchError((error) => {
        return of(this.onError(error))
      }),
    )

    return lastValueFrom(response$)
  }

  public fetchResource({
    key,
    resourcePath,
  }: {
    key: string
    resourcePath: string
  }) {
    const response$ = this.epubLoader.access(key).pipe(
      mergeMap(({ archive, release }) => {
        const manifest$ = from(
          generateResourceFromArchive(archive, resourcePath),
        )

        return manifest$.pipe(
          map((resource) => new Response(resource.body, { status: 200 })),
          finalize(() => {
            release()
          }),
        )
      }),
      catchError((error) => {
        return of(this.onError(error))
      }),
    )

    return lastValueFrom(response$)
  }
}
