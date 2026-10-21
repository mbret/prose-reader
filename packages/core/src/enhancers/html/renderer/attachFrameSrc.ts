import type { Manifest } from "@prose-reader/shared"
import {
  catchError,
  from,
  map,
  type Observable,
  of,
  switchMap,
  tap,
} from "rxjs"
import { Report } from "../../../report"
import type { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import type { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import {
  createHtmlPageFromResource,
  IMAGE_MEDIA_TYPES_REQUIRING_TRANSFORM,
} from "./createHtmlPageFromResource"

/**
 * For these resources, we want to digest and wrap them into custom html pages.
 *
 * Anything that does not fall under these criteria will be served as is.
 * If a format is not supported by prose it will simply renders whatever browser can render.
 * Support for these formats can then be interpreted by enhancers.
 */
const ITEM_EXTENSION_REQUIRES_TRANSFORM = [
  `.txt`,
  `.jpg`,
  `.jpeg`,
  `.png`,
  `.webp`,
  `.avif`,
]
const ITEM_MEDIA_TYPE_REQUIRES_TRANSFORM = [
  `text/plain`,
  ...IMAGE_MEDIA_TYPES_REQUIRING_TRANSFORM,
]

export const revokeFrameObjectUrl = (
  frameElement: HTMLIFrameElement | undefined,
) => {
  const objectUrl = frameElement?.getAttribute(`src`)

  if (!objectUrl?.startsWith(`blob:`)) return

  URL.revokeObjectURL(objectUrl)
}

export const attachFrameSrc = ({
  item,
  resourcesHandler,
}: {
  settings: ReaderSettingsManager
  item: Manifest[`spineItems`][number]
  resourcesHandler: ResourceHandler
}) => {
  const attachSource = (frameElement: HTMLIFrameElement, blob: Blob) => {
    revokeFrameObjectUrl(frameElement)

    const blobURL = URL.createObjectURL(blob)

    frameElement.setAttribute(`src`, blobURL)
  }

  return (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        return from(resourcesHandler.getResource()).pipe(
          switchMap((resource) => {
            const requiresTransform =
              ITEM_EXTENSION_REQUIRES_TRANSFORM.some((extension) =>
                item.href.endsWith(extension),
              ) ||
              (item.mediaType &&
                ITEM_MEDIA_TYPE_REQUIRES_TRANSFORM.includes(item.mediaType))

            const loadsDocumentByUrl =
              resource instanceof URL &&
              item.href.startsWith(window.location.origin) &&
              !requiresTransform

            /**
             * Loaded by its url, the document and the requests it makes go through the
             * network and any service worker. A page built here loads from a blob url,
             * against which no relative reference resolves: `loadAssets` swaps in the
             * ones it can.
             */
            if (loadsDocumentByUrl) {
              revokeFrameObjectUrl(frameElement)
              frameElement?.setAttribute(`src`, resource.href)

              return of(frameElement)
            }

            const resourceResponse$ =
              resource instanceof URL
                ? from(resourcesHandler.fetchResource())
                : of(resource)

            return resourceResponse$.pipe(
              switchMap((response) => {
                if (!(response instanceof Response)) {
                  throw new Error(`Invalid resource`)
                }

                return createHtmlPageFromResource(response, item)
              }),
              tap((blob) => {
                attachSource(frameElement, blob)
              }),
              map(() => frameElement),
              catchError((e) => {
                Report.error(
                  `Error while trying to fetch or load resource for item ${item.id}`,
                  resource,
                )
                Report.error(e)

                return of(frameElement)
              }),
            )
          }),
        )
      }),
    )
}
