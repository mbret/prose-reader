import { Archive } from "../../../archives/types"
import { HookResource } from "./types"

export const cssFixHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const file = Object.values(archive.files).find(
      (file) => file.uri === resourcePath,
    )

    if (file?.basename.endsWith(`.css`)) {
      const bodyToParse = resource.body ?? (await file.string())

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
