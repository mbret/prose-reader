import type {
  ResolvedMetadata,
  ResolvedMetadataHome,
} from "../types/resolvedMetadata"
import { omitUndefined } from "../utils/omitUndefined"
import type { AppleMetadata } from "./parse"

/**
 * Losslessness contract: the display options list is copied verbatim into
 * the `apple` corner (`apple.options`), with `fixed-layout` additionally
 * normalized into `apple.fixedLayout` and promoted to `renditionLayout`.
 */
export const appleMetadataHomes = {
  displayOptions: "apple.options",
} as const satisfies Record<
  Exclude<keyof AppleMetadata, "kind">,
  ResolvedMetadataHome
>

export const resolveApple = (input: AppleMetadata): ResolvedMetadata => {
  const options = input.displayOptions?.platform?.options

  const fixedLayoutValue = options
    ?.find((option) => option.name === "fixed-layout")
    ?.value.trim()
    .toLowerCase()
  const fixedLayout =
    fixedLayoutValue === "true"
      ? true
      : fixedLayoutValue === "false"
        ? false
        : undefined

  const apple = omitUndefined({
    fixedLayout,
    options:
      options !== undefined && options.length > 0
        ? options.map(({ name, value }) => omitUndefined({ name, value }))
        : undefined,
  })

  return omitUndefined({
    renditionLayout:
      fixedLayout === true ? ("pre-paginated" as const) : undefined,
    apple: Object.keys(apple).length > 0 ? apple : undefined,
  })
}
