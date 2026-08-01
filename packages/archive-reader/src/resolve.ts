import type { AppleMetadata } from "./apple/parse.ts"
import { resolveApple } from "./apple/resolve.ts"
import type { ComicInfo } from "./comicInfo/parse.ts"
import { resolveComicInfo } from "./comicInfo/resolve.ts"
import type { KoboMetadata } from "./kobo/parse.ts"
import { resolveKobo } from "./kobo/resolve.ts"
import type { OpfMetadata } from "./opf/parse.ts"
import { resolveOpf } from "./opf/resolve.ts"
import type { ResolvedMetadata } from "./types/resolvedMetadata.ts"

export type ResolvedArchiveInput =
  | ComicInfo
  | KoboMetadata
  | AppleMetadata
  | OpfMetadata

/**
 * Normalizes a single parsed source into the cross-format
 * {@link ResolvedMetadata} vocabulary. To combine several sources with the
 * documented precedence rules, use `resolveMetadata` instead.
 */
export const resolveArchiveMetadata = (
  input: ResolvedArchiveInput,
): ResolvedMetadata => {
  if (input.kind === "comicInfo") return resolveComicInfo(input)
  if (input.kind === "kobo") return resolveKobo(input)
  if (input.kind === "apple") return resolveApple(input)
  return resolveOpf(input)
}
