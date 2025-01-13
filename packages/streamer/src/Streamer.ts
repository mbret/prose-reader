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
  protected epubLoader: ReturnType<typeof createArchiveLoader>
  protected onError: OnError = (error) => {
    console.error(error)

    return new Response(String(error), { status: 500 })
  }
  protected onManifestSuccess: OnManifestSuccess
  protected lastAccessedKey: string | undefined

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

  public prune() {
    this.epubLoader.purge()
  }

  public accessArchive(key: string) {
    if (this.lastAccessedKey !== undefined && this.lastAccessedKey !== key) {
      this.epubLoader.purge()
    }

    this.lastAccessedKey = key

    return this.epubLoader.access(key)
  }

  public accessArchiveWithoutLock(key: string) {
    return this.accessArchive(key).pipe(
      map(({ archive, release }) => {
        release()

        return archive
      }),
    )
  }

  public fetchManifest({ key, baseUrl }: { key: string; baseUrl?: string }) {
    const response$ = this.accessArchive(key).pipe(
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
    const response$ = this.accessArchive(key).pipe(
      mergeMap(({ archive, release }) => {
        /**
         * We commonly use file:// for manifest without baseUrl. This ensure we
         * have valid URL for the reader while flagging them as local.
         *
         * However, we obviously don't have the file:// prefix on the archive.
         */
        const cleanedResourcePath = resourcePath.replaceAll(`file://`, ``)

        const manifest$ = from(
          generateResourceFromArchive(archive, cleanedResourcePath),
        )

        return manifest$.pipe(
          map(
            (resource) =>
              new Response(resource.body, {
                status: 200,
                headers: {
                  ...(resource.params.contentType && {
                    "Content-Type": resource.params.contentType,
                  }),
                },
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
}
