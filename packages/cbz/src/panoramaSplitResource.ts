import type { Archive } from "@prose-reader/archive-reader"
import { escapeXmlAttributeValue } from "@prose-reader/shared"
import type { HookResource } from "@prose-reader/streamer"
import {
  PANORAMA_RESOURCE_PREFIX,
  PANORAMA_SPLIT_DOCUMENT_MEDIA_TYPE,
  type PanoramaCropSide,
  type VirtualPanoramaResource,
} from "./panoramaSplitManifest"

type CropRect = {
  x: number
  width: number
  height: number
}

type ImageDimensions = {
  width: number
  height: number
}

const imageDimensionsCache = new WeakMap<
  Archive,
  Map<string, ImageDimensions>
>()

const decodeOriginalUriSegment = (encoded: string): string | undefined => {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return undefined
  }
}

export const parseVirtualPanoramaResourcePath = (
  resourcePath: string,
): VirtualPanoramaResource | undefined => {
  const prefixIndex = resourcePath.indexOf(`${PANORAMA_RESOURCE_PREFIX}/`)

  if (prefixIndex < 0) return undefined

  const virtualPath = resourcePath.slice(prefixIndex)
  const parts = virtualPath.split(`/`)

  const encodedOriginalUri = parts[2]
  const cropFileName = parts[3]

  if (
    parts.length !== 4 ||
    parts[0] !== `__prose-reader__` ||
    parts[1] !== `panorama` ||
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
  cropSide: PanoramaCropSide
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

const readImageDimensions = async (source: Blob): Promise<ImageDimensions> => {
  if (typeof createImageBitmap !== `function`) {
    throw new Error(`Panorama XHTML generation requires createImageBitmap`)
  }

  const bitmap = await createImageBitmap(source)

  try {
    return {
      height: bitmap.height,
      width: bitmap.width,
    }
  } finally {
    bitmap.close()
  }
}

export const createPanoramaSplitXhtml = ({
  cropSide,
  imageDimensions,
  originalUri,
}: {
  cropSide: PanoramaCropSide
  imageDimensions: ImageDimensions
  originalUri: string
}): string => {
  if (imageDimensions.width < 2) {
    throw new Error(`Panorama image is too narrow to split`)
  }

  const crop = cropRectForSide({
    cropSide,
    imageHeight: imageDimensions.height,
    imageWidth: imageDimensions.width,
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
        width: ${imageDimensions.width}px;
        height: ${imageDimensions.height}px;
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
}

const generatePanoramaSplitResource = async ({
  archive,
  resourcePath,
}: {
  archive: Archive
  resourcePath: string
}): Promise<HookResource | undefined> => {
  const virtualResource = parseVirtualPanoramaResourcePath(resourcePath)

  if (virtualResource === undefined) return undefined

  const file = archive.records.find(
    (file) => file.uri === virtualResource.originalUri && !file.dir,
  )

  if (file === undefined || file.dir) {
    throw new Error(
      `no source file found for virtual panorama resourcePath:${resourcePath}`,
    )
  }

  const archiveCache = imageDimensionsCache.get(archive) ?? new Map()

  if (!imageDimensionsCache.has(archive)) {
    imageDimensionsCache.set(archive, archiveCache)
  }

  const imageDimensions =
    archiveCache.get(virtualResource.originalUri) ??
    (await readImageDimensions(await file.blob()))

  archiveCache.set(virtualResource.originalUri, imageDimensions)

  const body = createPanoramaSplitXhtml({
    cropSide: virtualResource.cropSide,
    imageDimensions,
    originalUri: virtualResource.originalUri,
  })

  return {
    body,
    params: {
      contentType: PANORAMA_SPLIT_DOCUMENT_MEDIA_TYPE,
    },
  }
}

export const panoramaSplitResourceHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const panoramaResource = await generatePanoramaSplitResource({
      archive,
      resourcePath,
    })

    if (panoramaResource === undefined) return resource

    return {
      ...resource,
      ...panoramaResource,
      params: {
        ...resource.params,
        ...panoramaResource.params,
      },
    }
  }
