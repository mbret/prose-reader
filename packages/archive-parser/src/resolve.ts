import type { AppleMetadata } from "./apple/parse"
import { resolveApple } from "./apple/resolve"
import type { ComicInfo } from "./comicInfo/parse"
import { resolveComicInfo } from "./comicInfo/resolve"
import type { KoboMetadata } from "./kobo/parse"
import { resolveKobo } from "./kobo/resolve"
import type { OpfMetadata } from "./opf/parse"
import { resolveOpf } from "./opf/resolve"
import type { ArchiveResolveResult } from "./types/archiveResolve"

export type ResolvedArchiveInput =
  | ComicInfo
  | KoboMetadata
  | AppleMetadata
  | OpfMetadata

export const resolveArchiveMetadata = (
  input: ResolvedArchiveInput,
): ArchiveResolveResult => {
  if (input.kind === "comicInfo") return resolveComicInfo(input)
  if (input.kind === "kobo") return resolveKobo(input)
  if (input.kind === "apple") return resolveApple(input)
  return resolveOpf(input)
}
