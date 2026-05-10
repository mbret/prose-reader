import { escapeXmlAttributeValue } from "@prose-reader/shared"
import type { Archive } from "../archives/types"
import type { HookResource } from "../generators/resources/hooks/types"
import {
  PAGE_SPREAD_RESOURCE_PREFIX,
  PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
  type PageSpreadCropSide,
  type VirtualPageSpreadResource,
} from "./pageSpreadSplitManifest"

type CropRect = {
  x: number
  width: number
  height: number
}

const decodeOriginalUriSegment = (encoded: string): string | undefined => {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return undefined
  }
}

export const parseVirtualPageSpreadResourcePath = (
  resourcePath: string,
): VirtualPageSpreadResource | undefined => {
  const prefixIndex = resourcePath.indexOf(`${PAGE_SPREAD_RESOURCE_PREFIX}/`)

  if (prefixIndex < 0) return undefined

  const virtualPath = resourcePath.slice(prefixIndex)
  const parts = virtualPath.split(`/`)

  const encodedOriginalUri = parts[2]
  const cropFileName = parts[3]

  if (
    parts.length !== 4 ||
    parts[0] !== `__prose-reader__` ||
    parts[1] !== `page-spread` ||
    encodedOriginalUri === undefined ||
    cropFileName === undefined
  ) {
    return undefined
  }

  const cropSide = cropFileName.split(`.`)[0]

  if (cropSide !== `left` && cropSide !== `right`) return undefined

  const originalUri = decodeOriginalUriSegment(encodedOriginalUri)

  if (originalUri === undefined) return undefined

  return {
    originalUri,
    cropSide,
  }
}

const cropRectForSide = ({
  cropSide,
  imageHeight,
  imageWidth,
}: {
  cropSide: PageSpreadCropSide
  imageWidth: number
  imageHeight: number
}): CropRect => {
  const leftWidth = Math.floor(imageWidth / 2)
  const rightWidth = imageWidth - leftWidth

  return cropSide === `left`
    ? { x: 0, width: leftWidth, height: imageHeight }
    : { x: leftWidth, width: rightWidth, height: imageHeight }
}

/**
 * Since we create a virtual sub path we need to use the relative path to the original image.
 * There is no "real" path but the streamer does not need to know that.
 */
const getRelativeOriginalImageSrc = (originalUri: string) => {
  if (/^https?:\/\//.test(originalUri)) return originalUri

  return `../../../${encodeURI(originalUri)}`
}

export const createPageSpreadSplitXhtml = async ({
  cropSide,
  originalUri,
  source,
}: {
  source: Blob
  cropSide: PageSpreadCropSide
  originalUri: string
}): Promise<string> => {
  if (typeof createImageBitmap !== `function`) {
    throw new Error(`Page spread XHTML generation requires createImageBitmap`)
  }

  const bitmap = await createImageBitmap(source)

  try {
    if (bitmap.width < 2) {
      throw new Error(`Page spread image is too narrow to split`)
    }

    const crop = cropRectForSide({
      cropSide,
      imageHeight: bitmap.height,
      imageWidth: bitmap.width,
    })

    return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta name="viewport" content="width=${crop.width}, height=${crop.height}" />
    <style>
      html,
      body {
        width: ${crop.width}px;
        height: ${crop.height}px;
        margin: 0;
        overflow: hidden;
      }

      img {
        display: block;
        width: ${bitmap.width}px;
        height: ${bitmap.height}px;
        max-width: none;
        transform: translateX(-${crop.x}px);
        user-select: none;
        -webkit-user-drag: none;
      }
    </style>
  </head>
  <body>
    <img src="${escapeXmlAttributeValue(getRelativeOriginalImageSrc(originalUri))}" alt="" />
  </body>
</html>`
  } finally {
    bitmap.close()
  }
}

const generatePageSpreadSplitResource = async ({
  archive,
  resourcePath,
}: {
  archive: Archive
  resourcePath: string
}): Promise<HookResource | undefined> => {
  const virtualResource = parseVirtualPageSpreadResourcePath(resourcePath)

  if (virtualResource === undefined) return undefined

  const file = archive.records.find(
    (file) => file.uri === virtualResource.originalUri && !file.dir,
  )

  if (file === undefined || file.dir) {
    throw new Error(
      `no source file found for virtual page spread resourcePath:${resourcePath}`,
    )
  }

  const body = await createPageSpreadSplitXhtml({
    cropSide: virtualResource.cropSide,
    originalUri: virtualResource.originalUri,
    source: await file.blob(),
  })

  return {
    body,
    params: {
      contentType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
    },
  }
}

export const pageSpreadSplitResourceHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const pageSpreadResource = await generatePageSpreadSplitResource({
      archive,
      resourcePath,
    })

    if (pageSpreadResource === undefined) return resource

    return {
      ...resource,
      ...pageSpreadResource,
      params: {
        ...resource.params,
        ...pageSpreadResource.params,
      },
    }
  }
