import { escapeXmlAttributeValue } from "@prose-reader/shared"
import type { Archive } from "../archives/types"
import type { HookResource } from "../generators/resources/hooks/types"
import {
  decodeImageWrapperIdToOriginalUri,
  IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
  IMAGE_WRAPPER_RESOURCE_PREFIX,
  type ImageWrapperResource,
} from "./pageSpreadSplitManifest"

export const parseImageWrapperResourcePath = (
  resourcePath: string,
): ImageWrapperResource | undefined => {
  const prefixIndex = resourcePath.indexOf(`${IMAGE_WRAPPER_RESOURCE_PREFIX}/`)

  if (prefixIndex < 0) return undefined

  const virtualPath = resourcePath.slice(prefixIndex)
  const parts = virtualPath.split(`/`)

  const wrapperFileName = parts[2]

  if (
    parts.length !== 3 ||
    parts[0] !== `__prose-reader__` ||
    parts[1] !== `image-wrapper` ||
    wrapperFileName === undefined ||
    !wrapperFileName.endsWith(`.xhtml`)
  ) {
    return undefined
  }

  const originalUri = decodeImageWrapperIdToOriginalUri(
    wrapperFileName.slice(0, -`.xhtml`.length),
  )

  if (originalUri === undefined) return undefined

  return {
    originalUri,
  }
}

/**
 * Since we create a virtual sub path we need to use the relative path to the original image.
 * There is no "real" path but the streamer does not need to know that.
 */
const getRelativeOriginalImageSrc = (originalUri: string) => {
  if (/^https?:\/\//.test(originalUri)) return originalUri

  return `../../${encodeURI(originalUri)}`
}

export const createImageWrapperXhtml = ({
  originalUri,
}: {
  originalUri: string
}): string => {
  const escapedSrc = escapeXmlAttributeValue(
    getRelativeOriginalImageSrc(originalUri),
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
      }

      img {
        user-select: none;
        -webkit-user-drag: none;
      }
    </style>
  </head>
  <body>
    <div>
      <img id="spread-image" src="${escapedSrc}" alt="" />
    </div>
  </body>
</html>`
}

const generateImageWrapperResource = async ({
  archive,
  resourcePath,
}: {
  archive: Archive
  resourcePath: string
}): Promise<HookResource | undefined> => {
  const virtualResource = parseImageWrapperResourcePath(resourcePath)

  if (virtualResource === undefined) return undefined

  const file = archive.records.find(
    (file) => file.uri === virtualResource.originalUri && !file.dir,
  )

  if (file === undefined || file.dir) {
    throw new Error(
      `no source file found for image wrapper resourcePath:${resourcePath}`,
    )
  }

  const body = createImageWrapperXhtml({
    originalUri: virtualResource.originalUri,
  })

  return {
    body,
    params: {
      contentType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
    },
  }
}

export const pageSpreadSplitResourceHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const pageSpreadResource = await generateImageWrapperResource({
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
