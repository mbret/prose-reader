import {
  getArchiveFileRecordByUri,
  readRecordAsText,
} from "@prose-reader/archive-reader"
import type {
  StreamerResourceHook,
  StreamerResourceHookContext,
  StreamerResourceHookFactory,
} from "../../../hooks"

/**
 * Shared scaffolding for resource hooks that rewrite the text body of a single
 * archive file matching a given extension.
 *
 * Resolves the archive record for `resourcePath` and, when its basename ends
 * with `extension`, reads the resource body as text (reusing an already-string
 * body, otherwise reading the record) and passes it to `transform`. When
 * `transform` returns a string the resource body is replaced; when it returns
 * `undefined` the resource is returned untouched (so a non-string body is
 * preserved as-is).
 */
export const createTextResourceHook =
  (
    extension: string,
    transform: (
      body: string,
    ) => string | undefined | Promise<string | undefined>,
  ): StreamerResourceHookFactory =>
  ({
    archive,
    resourcePath,
  }: StreamerResourceHookContext): StreamerResourceHook =>
  async (resource) => {
    const file = getArchiveFileRecordByUri(archive, resourcePath)

    if (file?.basename.endsWith(extension)) {
      const bodyToParse =
        typeof resource.body === `string`
          ? resource.body
          : await readRecordAsText(file)

      const newBody = await transform(bodyToParse)

      if (newBody !== undefined) {
        return {
          ...resource,
          body: newBody,
        }
      }
    }

    return resource
  }
