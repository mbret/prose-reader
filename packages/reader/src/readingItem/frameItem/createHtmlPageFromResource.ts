import { Manifest } from "../../types"
import { detectContentType, parseContentType } from "../../utils/contentType"
import { getBase64FromBlob } from "../../utils/objects"

/**
 * Document is application/xhtml+xml
 */
export const createHtmlPageFromResource = async (resourceResponse: Response | string, item: Manifest[`readingOrder`][number]) => {
  if (typeof resourceResponse === `string`) return resourceResponse

  const contentType = parseContentType(resourceResponse.headers.get(`Content-Type`) || ``) || detectContentType(item.href)

  if ([`image/jpg`, `image/jpeg`, `image/png`, `image/webp`].some(mime => mime === contentType)) {
    const data = await getBase64FromBlob(await resourceResponse.blob())

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, minimum-scale=0.1">
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

  if ([`text/plain`].some(mime => mime === contentType)) {
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
