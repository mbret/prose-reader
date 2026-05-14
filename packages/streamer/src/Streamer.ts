import type { Manifest } from "@prose-reader/shared"
import {
  catchError,
  finalize,
  from,
  lastValueFrom,
  map,
  mergeMap,
  type Observable,
  of,
  switchMap,
} from "rxjs"
import { createArchiveLoader } from "./archives/archiveLoader"
import type { Archive } from "./archives/types"
import { generateManifestFromArchive } from "./generators/manifest"
import { generateResourceFromArchive } from "./generators/resources"
import type { StreamerHooks } from "./hooks"
import { createRangeResponse } from "./utils/createRangeResponse"

type OnError = (error: unknown) => Response
type OnManifestSuccess = (params: {
  manifest: Manifest
  archive: Archive
}) => Observable<Manifest> | Promise<Manifest>
type WithArchiveResponse = (
  archive: Archive,
) => Observable<Response> | Promise<Response>

const fileProtocol = `file://`
const httpProtocolPattern = /^https?:\/\//

const decodeResourcePath = (resourcePath: string) => {
  try {
    return decodeURIComponent(resourcePath)
  } catch {
    return resourcePath
  }
}

const stripFileProtocol = (resourcePath: string) =>
  resourcePath.startsWith(fileProtocol)
    ? resourcePath.slice(fileProtocol.length)
    : resourcePath

const normalizeResourcePath = (resourcePath: string) => {
  const resourcePathWithoutFileProtocol = stripFileProtocol(resourcePath)

  if (httpProtocolPattern.test(resourcePathWithoutFileProtocol)) {
    return resourcePathWithoutFileProtocol
  }

  return stripFileProtocol(decodeResourcePath(resourcePathWithoutFileProtocol))
}

export class Streamer {
  protected archiveLoader: ReturnType<typeof createArchiveLoader>
  protected onError: OnError = (error) => {
    console.error(error)

    return new Response(String(error), { status: 500 })
  }
  protected hooks: StreamerHooks
  protected onManifestSuccess: OnManifestSuccess
  protected lastAccessedKey: string | undefined

  constructor({
    hooks,
    onError,
    onManifestSuccess,
    ...rest
  }: Parameters<typeof createArchiveLoader>[0] & {
    hooks?: StreamerHooks
    onError?: OnError
    onManifestSuccess?: OnManifestSuccess
  }) {
    this.archiveLoader = createArchiveLoader(rest)
    this.hooks = hooks ?? {}

    this.onManifestSuccess =
      onManifestSuccess ?? (({ manifest }) => Promise.resolve(manifest))
    this.onError = onError ?? this.onError
  }

  public prune() {
    this.archiveLoader.purge()
  }

  public accessArchive(key: string) {
    if (this.lastAccessedKey !== undefined && this.lastAccessedKey !== key) {
      this.archiveLoader.purge()
    }

    this.lastAccessedKey = key

    return this.archiveLoader.access(key)
  }

  public accessArchiveWithoutLock(key: string) {
    return this.accessArchive(key).pipe(
      map(({ archive, release }) => {
        release()

        return archive
      }),
    )
  }

  protected withArchiveResponse({
    key,
    getResponse,
  }: {
    key: string
    getResponse: WithArchiveResponse
  }) {
    const response$ = this.accessArchive(key).pipe(
      mergeMap(({ archive, release }) =>
        from(getResponse(archive)).pipe(
          finalize(() => {
            release()
          }),
        ),
      ),
      catchError((error) => {
        return of(this.onError(error))
      }),
    )

    return lastValueFrom(response$)
  }

  public fetchManifest({ key, baseUrl }: { key: string; baseUrl?: string }) {
    return this.withArchiveResponse({
      key,
      getResponse: (archive) => {
        const manifest$ = from(
          generateManifestFromArchive(archive, {
            baseUrl,
            hooks: this.hooks.manifest,
          }),
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
        )
      },
    })
  }

  public fetchResource({
    key,
    resourcePath,
    request,
  }: {
    key: string
    resourcePath: string
    request?: Request
  }) {
    return this.withArchiveResponse({
      key,
      getResponse: (archive) => {
        /**
         * We commonly use file:// for manifest without baseUrl. This ensure we
         * have valid URL for the reader while flagging them as local.
         *
         * However, we obviously don't have the file:// prefix on the archive.
         */
        const cleanedResourcePath = normalizeResourcePath(resourcePath)

        /**
         * Reader hot path: one `generateResourceFromArchive` per request. For
         * EPUBs, `defaultHook` re-reads and re-parses the package OPF each time
         * (no `archiveOpf` threading yet). See `generateResourceFromArchive` JSDoc.
         */
        const resource$ = from(
          generateResourceFromArchive(archive, cleanedResourcePath, {
            hooks: this.hooks.resource,
          }),
        )

        return resource$.pipe(
          map((resource) =>
            createRangeResponse({
              body: resource.body ?? "",
              contentType: resource.params.contentType,
              rangeHeader: request?.headers.get("range"),
            }),
          ),
        )
      },
    })
  }
}
