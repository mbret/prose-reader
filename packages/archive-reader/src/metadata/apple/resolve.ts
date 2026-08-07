import type { Exhaustive } from "../../types/exhaustive.ts"
import type {
  ResolvedAppleMetadata,
  ResolvedMetadata,
} from "../../types/resolvedMetadata.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import type { AppleMetadata } from "./parse.ts"

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
  } satisfies Exhaustive<ResolvedAppleMetadata>)

  return omitUndefined({
    renditionLayout:
      fixedLayout === true ? ("pre-paginated" as const) : undefined,
    apple: Object.keys(apple).length > 0 ? apple : undefined,
  })
}
