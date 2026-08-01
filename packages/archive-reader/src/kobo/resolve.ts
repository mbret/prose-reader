import type {
  ResolvedMetadata,
  ResolvedMetadataHome,
} from "../types/resolvedMetadata.ts"
import { omitUndefined } from "../utils/omitUndefined.ts"
import type { KoboMetadata } from "./parse.ts"

/** Losslessness contract for the Kobo sidecar fields. */
export const koboMetadataHomes = {
  renditionLayout: "renditionLayout",
} as const satisfies Record<
  Exclude<keyof KoboMetadata, "kind">,
  ResolvedMetadataHome
>

export const resolveKobo = (input: KoboMetadata): ResolvedMetadata =>
  omitUndefined({
    renditionLayout: input.renditionLayout,
    kobo:
      input.renditionLayout !== undefined
        ? { fixedLayout: input.renditionLayout === "pre-paginated" }
        : undefined,
  })
