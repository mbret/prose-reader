import type { ArchiveResolveResult } from "../types/archiveResolve"
import type { KoboMetadata } from "./parse"

export const resolveKobo = (input: KoboMetadata): ArchiveResolveResult => {
  const { renditionLayout } = input
  return renditionLayout !== undefined ? { renditionLayout } : {}
}
