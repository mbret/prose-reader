import type { Manifest } from "@prose-reader/shared"
import {
  type Observable,
  catchError,
  from,
  map,
  of,
  switchMap,
  tap,
} from "rxjs"
import { ITEM_EXTENSION_VALID_FOR_FRAME_SRC } from "../../../constants"
import { Report } from "../../../report"
import type { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import type { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"

export const attachFrameSrc = ({
  item,
  resourcesHandler,
}: {
  settings: ReaderSettingsManager
  item: Manifest[`spineItems`][number]
  resourcesHandler: ResourceHandler
}) => {
  const getHtmlFromResource = (response: Response) =>
    createHtmlPageFromResource(response, item)

  return (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        return from(resourcesHandler.getResource()).pipe(
          switchMap((resource) => {
            /**
             * Because of the bug with iframe and sw, we should not use srcdoc and sw together for
             * html document. This is because resources will not pass through SW. IF `fetchResource` is being
             * used the user should be aware of the limitation. We use srcdoc for everything except if we detect
             * an html document and same origin. Hopefully that bug gets fixed one day.
             * @see https://bugs.chromium.org/p/chromium/issues/detail?id=880768
             */
            if (
              resource instanceof URL &&
              item.href.startsWith(window.location.origin) &&
              // we have an encoding and it's a valid html
              ((item.mediaType &&
                [
                  `application/xhtml+xml`,
                  `application/xml`,
                  `text/html`,
                  `text/xml`,
                ].includes(item.mediaType)) ||
                // no encoding ? then try to detect html
                (!item.mediaType &&
                  ITEM_EXTENSION_VALID_FOR_FRAME_SRC.some((extension) =>
                    item.href.endsWith(extension),
                  )))
            ) {
              frameElement?.setAttribute(`src`, item.href)

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

                return from(getHtmlFromResource(response))
              }),
              tap((htmlDoc) => {
                if (htmlDoc) {
                  const blob = new Blob([htmlDoc], { type: "text/html" })
                  /**
                   * The blob will be released once the document is destroyed.
                   * No need to deal with it ourselves.
                   */
                  const blobURL = URL.createObjectURL(blob)

                  frameElement?.setAttribute(`src`, blobURL)
                }
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
