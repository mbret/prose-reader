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

const joinPath = (base: string, path: string) => {
  return new URL(path, base).toString()
}

const getElementsWithAssets = (document: Document | null | undefined) => {
  const RESOURCE_ELEMENTS = [
    "img", // Images
    "video", // Video files
    "audio", // Audio files
    "source", // Source elements within video/audio
    "link", // Stylesheets and other linked resources
    "script", // JavaScript files
  ].join(",")

  return Array.from(document?.querySelectorAll(RESOURCE_ELEMENTS) || [])
}

export const loadAssets =
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
        const elementsWithAsset = getElementsWithAssets(
          frameElement.contentDocument,
        )

        const assetsLoad$ = Array.from(elementsWithAsset).map((element) => {
          const originalSrc =
            element.getAttribute("src") || element.getAttribute("href")

          if (!originalSrc) return of(null)

          // EPUB/cover.html -> EPUB/
          const spineItemUriParentPath = getParentPath(item.href)

          // EPUB/image.png needs to match frame relative src /image.png
          const foundItem = context.manifest?.items.find(({ href }) => {
            // this will remove things like "../.." and have a normal relative path
            return `${joinPath(spineItemUriParentPath, originalSrc).toLowerCase()}`.endsWith(
              `${href.toLowerCase()}`,
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

                if (element.hasAttribute("src")) {
                  element.setAttribute("src", blobUrl)
                } else if (element.hasAttribute("href")) {
                  element.setAttribute("href", blobUrl)
                }
              }
            }),
          )
        })

        return combineLatest(assetsLoad$).pipe(map(() => frameElement))
      }),
    )

export const unloadMedias = (frameElement?: HTMLIFrameElement) => {
  const elementsWithAsset = getElementsWithAssets(frameElement?.contentDocument)

  elementsWithAsset.forEach((element) => {
    const url = element.getAttribute("src") || element.getAttribute("href")
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url)
    }
  })
}
