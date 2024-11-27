import {
  combineLatest,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
} from "rxjs"
import { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { getParentPath, Manifest } from "@prose-reader/shared"
import { Context } from "../../../context/Context"

export const loadMedias =
  ({
    settings,
    item,
    context,
  }: {
    settings: ReaderSettingsManager
    item: Manifest["items"][number]
    context: Context
  }) =>
  (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        const images =
          frameElement.contentDocument?.getElementsByTagName("img") || []

        const imageObservables = Array.from(images).map((img) => {
          const originalSrc = img.getAttribute("src")

          // EPUB/cover.html -> EPUB/
          const spineItemUriParentPath = getParentPath(item.href)

          // EPUB/image.png needs to match frame relative src /image.png
          const foundItem = context.manifest?.items.find(({ href }) => {
            return `${spineItemUriParentPath}/${originalSrc}`.endsWith(
              `${href}`,
            )
          })

          if (!foundItem) return of(null)

          const resourceHandler = new ResourceHandler(foundItem, settings)

          /**
           * For each resources, if it's a response and not a URL, we should convert it to a blob
           * because it will not be accessible otherwise.
           */
          return from(resourceHandler.getResource()).pipe(
            mergeMap((resource) =>
              resource instanceof Response
                ? from(resource.blob())
                : of(undefined),
            ),
            tap((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob)

                img.src = blobUrl
              }
            }),
          )
        })

        return combineLatest(imageObservables).pipe(map(() => frameElement))
      }),
    )

export const unloadMedias = (frameElement?: HTMLIFrameElement) => {
  const images = Array.from(
    frameElement?.contentDocument?.getElementsByTagName("img") || [],
  )

  images.forEach((img) => {
    // Revoke blob URLs to prevent memory leaks
    if (img.src.startsWith("blob:")) {
      URL.revokeObjectURL(img.src)
    }
  })
}
