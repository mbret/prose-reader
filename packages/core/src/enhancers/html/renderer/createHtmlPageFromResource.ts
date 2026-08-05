import { detectMimeTypeFromName, parseContentType } from "@prose-reader/shared"
import type { Manifest } from "../../.."

/**
 * Raster images we wrap into a generated html page (viewport metadata,
 * sizing). Restricted to types every modern browser decodes with
 * `createImageBitmap`: a type listed here that the browser cannot decode
 * would leave the frame without any document at all.
 */
const IMAGE_MEDIA_TYPES_REQUIRING_TRANSFORM = [
  `image/jpg`,
  `image/jpeg`,
  `image/png`,
  `image/webp`,
  `image/avif`,
  `image/gif`,
  `image/bmp`,
]

const MEDIA_TYPES_REQUIRING_TRANSFORM = [
  `text/plain`,
  ...IMAGE_MEDIA_TYPES_REQUIRING_TRANSFORM,
]

/**
 * Resolves the media type driving the html page transform, or undefined when
 * the resource must be served untouched.
 *
 * Both the transform decision (`attachFrameSrc`) and the transform itself
 * resolve through this single function so the two cannot drift: a type gated
 * in only one of the two places would reach the frame as a raw image document
 * without viewport metadata and lay out incorrectly.
 *
 * Candidates that are not transformable are skipped rather than trusted, so a
 * generic response header (eg `application/octet-stream`) on a `.avif`
 * resource does not bypass the wrap. The manifest media type wins over the
 * response header, which wins over the name-based detection.
 */
export const getTransformMediaType = ({
  href,
  mediaType,
  responseContentType,
}: {
  href: string
  mediaType?: string
  responseContentType?: string
}) =>
  [mediaType, responseContentType, detectMimeTypeFromName(href)].find(
    (type) => !!type && MEDIA_TYPES_REQUIRING_TRANSFORM.includes(type),
  )

/**
 * Document is application/xhtml+xml
 * @todo move this into a enhancer
 * @todo only keep a very basic default one which just put the resource as <media> inside html page
 * @todo use the core default one as last resort if the pipe does not return an html document
 */
export const createHtmlPageFromResource = async (
  resourceResponse: Response | string,
  item: Manifest[`spineItems`][number],
): Promise<Blob> => {
  if (typeof resourceResponse === "string") {
    return new Blob([resourceResponse], { type: "text/html" })
  }

  const transformMediaType = getTransformMediaType({
    href: item.href,
    mediaType: item.mediaType,
    responseContentType: parseContentType(
      resourceResponse.headers.get(`Content-Type`) || ``,
    ),
  })

  if (
    transformMediaType &&
    IMAGE_MEDIA_TYPES_REQUIRING_TRANSFORM.includes(transformMediaType)
  ) {
    const blob = await resourceResponse.blob()
    const objectUrl = URL.createObjectURL(blob)
    const bitmap = await createImageBitmap(blob)
    const { width, height } = { width: bitmap.width, height: bitmap.height }
    bitmap.close()

    return new Blob(
      [
        `
        <html>
          <head>
            ${item.renditionLayout === `pre-paginated` ? `<meta name="viewport" content="width=${width}, height=${height}">` : ``}
          </head>
          <body style="margin: 0px;" tab-index="-1;">
             <img
               src="${objectUrl}"
               style="max-width:100%;height:100%;object-fit:contain;display:block;"
             >
          </body>
        </html>
          `,
      ],
      { type: "text/html" },
    )
  }

  if (transformMediaType === `text/plain`) {
    const data = await resourceResponse.text()

    return new Blob(
      [
        `
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
          <head>
            <style>
              pre {
                white-space: pre;
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <pre>${data}</pre>
          </body>
        </html>
      `,
      ],
      { type: "text/html" },
    )
  }

  return await resourceResponse.blob()
}
