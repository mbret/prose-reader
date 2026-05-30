import { readRecordAsText } from "../../../archives/readRecordAsText"
import {
  type Archive,
  getArchiveFileRecordByUri,
} from "../../../archives/types"
import type { HookResource } from "./types"

export const cssFixHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const file = getArchiveFileRecordByUri(archive, resourcePath)

    if (file?.basename.endsWith(`.css`)) {
      const bodyToParse =
        typeof resource.body === `string`
          ? resource.body
          : await readRecordAsText(file)

      /**
       * Fix the potentially invalid writing mode present on some vertical book.
       * This has the benefit of making it compatible with firefox as well.
       */
      const newBody = bodyToParse.replaceAll(
        `-webkit-writing-mode`,
        `writing-mode`,
      )

      return {
        ...resource,
        body: newBody,
      }
    }

    return resource
  }
