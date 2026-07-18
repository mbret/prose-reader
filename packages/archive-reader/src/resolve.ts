import type { AppleMetadata } from "./apple/parse"
import { resolveApple } from "./apple/resolve"
import type { ComicInfo } from "./comicInfo/parse"
import { resolveComicInfo } from "./comicInfo/resolve"
import type { KoboMetadata } from "./kobo/parse"
import { resolveKobo } from "./kobo/resolve"
import type { OpfMetadata } from "./opf/parse"
import { resolveOpf } from "./opf/resolve"
import type { ResolvedMetadata } from "./types/resolvedMetadata"

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
