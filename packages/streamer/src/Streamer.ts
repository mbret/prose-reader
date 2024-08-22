import {
  catchError,
  finalize,
  from,
  lastValueFrom,
  map,
  mergeMap,
  of,
} from "rxjs"
import { createArchiveLoader } from "./archives/archiveLoader"
import { Manifest } from "@prose-reader/shared"
import { generateManifestFromArchive } from "./generators/manifest"
import { generateResourceFromArchive } from "./generators/resources"

export class Streamer {
  epubLoader: ReturnType<typeof createArchiveLoader>
  onError = (error: unknown) => {
    return new Response(String(error), { status: 500 })
  }

  constructor({
    onError,
    ...rest
  }: Parameters<typeof createArchiveLoader>[0] & {
    onError?: (error: unknown) => Response
  }) {
    this.epubLoader = createArchiveLoader(rest)

    this.onError = onError ?? this.onError
  }

  public fetchManifest({ key, baseUrl }: { key: string; baseUrl?: string }) {
    const response$ = this.epubLoader.access(key).pipe(
      mergeMap(({ archive, release }) => {
        const manifest$ = from(
          generateManifestFromArchive(archive, { baseUrl }),
        )

        return manifest$.pipe(
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
