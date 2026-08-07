import type { Exhaustive } from "../../types/exhaustive.ts"
import type {
  ResolvedKoboMetadata,
  ResolvedMetadata,
} from "../../types/resolvedMetadata.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import type { KoboMetadata } from "./parse.ts"

export const resolveKobo = (input: KoboMetadata): ResolvedMetadata =>
  omitUndefined({
    renditionLayout: input.renditionLayout,
    kobo:
      input.renditionLayout !== undefined
        ? ({
            fixedLayout: input.renditionLayout === "pre-paginated",
          } satisfies Exhaustive<ResolvedKoboMetadata>)
        : undefined,
  })
