import { Manifest } from "../../types"
import { detectMimeTypeFromName, parseContentType } from "@prose-reader/shared"
import { getBase64FromBlob } from "../../utils/objects"

const getIntrinsicDimensionsFromBase64Img = (data: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.src = data
    image.onload = () => {
      resolve({ height: image.naturalHeight, width: image.naturalWidth })
    }
    image.onerror = reject
  })

/**
 * Document is application/xhtml+xml
 * @todo move this into a enhancer
 * @todo only keep a very basic default one which just put the resource as <media> inside html page
 * @todo use the core default one as last resort if the pipe does not return an html document
 */
export const createHtmlPageFromResource = async (
  resourceResponse: Response | string,
  item: Manifest[`spineItems`][number],
) => {
  if (typeof resourceResponse === `string`) return resourceResponse

  const contentType =
    parseContentType(resourceResponse.headers.get(`Content-Type`) || ``) || detectMimeTypeFromName(item.href)

  if ([`image/jpg`, `image/jpeg`, `image/png`, `image/webp`].some((mime) => mime === contentType)) {
    const data = await getBase64FromBlob(await resourceResponse.blob())
    const { height, width } = await getIntrinsicDimensionsFromBase64Img(data)

    return `
      <html>
        <head>
          ${item.renditionLayout !== `reflowable` ? `<meta name="viewport" content="width=${width}, height=${height}">` : ``}
        </head>
        <body style="margin: 0px;" tab-index="-1;">
          <img
            src="${data}"
            style="max-width: 100%;height:100%;object-fit:contain;"
          >
        </body>
      </html>
        `
  }

  if ([`text/plain`].some((mime) => mime === contentType)) {
    const data = await resourceResponse.text()

    return `
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
    `
  }

  const content = await resourceResponse.text()

  // return content.replace(`<head>`, `<head><base xmlns href="${item.href}" />`)

  return content
}
