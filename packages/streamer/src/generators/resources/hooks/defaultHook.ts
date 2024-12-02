import { Archive } from "../../../archives/types"
import { getItemsFromDoc } from "../../manifest/hooks/epub/epub"
import xmldoc from "xmldoc"
import { HookResource } from "./types"
import { getArchiveOpfInfo } from "../../../epubs/getArchiveOpfInfo"

/**
 * We are trying to metadata from opf file in epub archive.
 *
 * Otherwise we fallback on what we can know from the archive.
 */
const getMetadata = async (archive: Archive, resourcePath: string) => {
  const opfInfo = getArchiveOpfInfo(archive)
  const data = await opfInfo.data?.string()

  if (data) {
    const opfXmlDoc = new xmldoc.XmlDocument(data)
    const items = getItemsFromDoc(opfXmlDoc, archive, () => "")

    // we are comparing opf items relative absolute path in epub archive
    // against resourcePatch (which are absolute path in archive).
    // They should in theory match.
    const foundMediaType = items.find((item) =>
      resourcePath.endsWith(item.href),
    )?.mediaType

    if (foundMediaType) {
      return {
        mediaType: items.find((item) => resourcePath.endsWith(item.href))
          ?.mediaType,
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
    const file = Object.values(archive.files).find(
      (file) => file.uri === resourcePath,
    )

    if (!file) return resource

    // if (file.stream) {
    //   const stream = file.stream()

    //   console.log(file, stream)
    //   stream.on(`data`, data => {
    //     console.log(`data`, data)
    //   })
    //   stream.on(`error`, data => {
    //     console.error(`error`, data)
    //   })
    //   stream.on(`end`, () => {
    //     console.log(`end`)
    //   })

    // }

    // const stream = file.stream!()

    // const readableStream = new ReadableStream({
    //   start(controller) {
    //     function push() {
    //       stream.on(`data`, data => {
    //         controller.enqueue(data)
    //       })
    //       stream.on(`error`, data => {
    //         console.error(`error`, data)
    //       })
    //       stream.on(`end`, () => {
    //         controller.close()
    //       })

    //       stream.resume()
    //     }

    //     push();
    //   }
    // })

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
