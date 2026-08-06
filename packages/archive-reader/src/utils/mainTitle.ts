import type { ResolvedMetadata } from "../types/resolvedMetadata.ts"

/**
 * The publication's main title: the first title the source states, in
 * document order.
 *
 * EPUB 3 requires reading systems to present the first `dc:title` as the
 * title of the publication, so a `title-type` of `main` on a later element
 * does not displace it — searching the list for that type is the mistake this
 * helper exists to prevent.
 */
export const mainTitle = (
  metadata: Pick<ResolvedMetadata, "titles"> | undefined,
): string | undefined => metadata?.titles?.[0]?.value
