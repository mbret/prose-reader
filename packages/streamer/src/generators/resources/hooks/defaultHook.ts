import {
  type Archive,
  getArchiveFileRecordByUri,
  readArchiveOpf,
} from "@prose-reader/archive-reader"
import type { HookResource } from "./types"

/**
 * Resolves `contentType` from the package OPF when possible, else from the URI.
 * Uses `readArchiveOpf` each time — see `generateResourceFromArchive` JSDoc for
 * why that can mean repeated OPF work on the resource path.
 */
const getMetadata = async (archive: Archive, resourcePath: string) => {
  const parsed = await readArchiveOpf(archive)

  if (parsed) {
    const { opf, basePath } = parsed

    // we are comparing opf items container-relative path in epub archive
    // against resourcePath (which is an absolute path in archive).
    // They should in theory match.
    const foundMediaType = opf.manifestItems.find((item) => {
      const containerHref = basePath ? `${basePath}/${item.href}` : item.href

      return resourcePath.endsWith(containerHref)
    })?.mediaType

    if (foundMediaType) {
      return {
        mediaType: foundMediaType,
      }
    }
  }

  return {
    mediaType: getContentTypeFromExtension(resourcePath),
  }
}

const getContentTypeFromExtension = (uri: string) => {
  if (uri.endsWith(`.css`)) {
    return `text/css; charset=UTF-8`
  }
  if (uri.endsWith(`.jpg`)) {
    return `image/jpg`
  }
  if (uri.endsWith(`.xhtml`)) {
    return `application/xhtml+xml`
  }
  if (uri.endsWith(`.mp4`)) {
    return `video/mp4`
  }
  if (uri.endsWith(`.svg`)) {
    return `image/svg+xml`
  }
}

export const defaultHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const file = getArchiveFileRecordByUri(archive, resourcePath)

    if (!file) return resource

    const metadata = await getMetadata(archive, resourcePath)

    return {
      ...resource,
      params: {
        ...resource.params,
        ...(file?.encodingFormat && {
          contentType: file.encodingFormat,
        }),
        ...(metadata.mediaType && {
          contentType: metadata.mediaType,
        }),
      },
    }
  }
