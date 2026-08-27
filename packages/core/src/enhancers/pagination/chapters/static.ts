import type { Manifest } from "@prose-reader/shared"
import {
  buildChapterInfoFromChain,
  buildTocIndex,
  getSpineItemIndexByHref,
  isPossibleTocItemCandidateForHref,
  stripAnchor,
} from "./shared"
import type { ChapterInfo, FlatTocEntry, TocIndex, TocPathEntry } from "./types"

const shouldSkipAnchorSubChapter = ({
  candidate,
  hrefHasAnchor,
}: {
  candidate: FlatTocEntry
  hrefHasAnchor: boolean
}) => {
  if (hrefHasAnchor || !candidate.anchorId) return false

  const candidateEntry = candidate.chain[candidate.chain.length - 1]
  const parentEntry = candidate.chain[candidate.chain.length - 2]
  if (!candidateEntry || !parentEntry) return false

  return stripAnchor(candidateEntry.path) === stripAnchor(parentEntry.path)
}

const findChapterChainByHref = ({
  href,
  tocIndex,
  spineItemIndexByHref,
}: {
  href: string
  tocIndex: FlatTocEntry[]
  spineItemIndexByHref: Map<string, number>
}): TocPathEntry[] | undefined => {
  const hrefWithoutAnchor = stripAnchor(href)
  const hrefHasAnchor = href.includes(`#`)
  const spineItemIndex = spineItemIndexByHref.get(hrefWithoutAnchor) ?? -1

  let bestChain: TocPathEntry[] | undefined

  for (const candidate of tocIndex) {
    const isPossibleTocItemCandidate = isPossibleTocItemCandidateForHref(
      hrefWithoutAnchor,
      candidate.hrefWithoutAnchor,
    )
    if (!isPossibleTocItemCandidate) continue

    if (spineItemIndex < candidate.spineItemIndex) continue
    if (shouldSkipAnchorSubChapter({ candidate, hrefHasAnchor })) continue

    bestChain = candidate.chain
  }

  return bestChain
}

/**
 * @important it's important to compare only path vs path and or href vs href since
 * they have not comparable due to possible encoded values
 */
export const buildChaptersInfo = (
  href: string,
  tocItem: NonNullable<Manifest["nav"]>["toc"],
  manifest: Manifest,
): ChapterInfo | undefined => {
  const tocIndex = buildTocIndex(tocItem, manifest)
  const spineItemIndexByHref = getSpineItemIndexByHref(manifest)
  const chapterChain = findChapterChainByHref({
    href,
    tocIndex,
    spineItemIndexByHref,
  })

  return chapterChain ? buildChapterInfoFromChain(chapterChain) : undefined
}

export type StaticChaptersResolver = {
  /**
   * Fallback chapter info for a spine item, resolved from its own href against
   * the TOC. Returns `undefined` for spine items not present in the TOC.
   */
  get: (spineItemId: string) => ChapterInfo | undefined
}

/**
 * Lazily resolve the static (href-based) fallback chapter info per spine item.
 *
 * This fallback is only read for the few spine items actually displayed (see
 * `mapChapterInfo`), yet the previous implementation eagerly resolved it for
 * *every* spine item at book open — an O(spineItems × tocEntries) pass whose
 * result was mostly thrown away on large books. Resolving on demand and caching
 * per id makes the cost proportional to the items the reader visits, and each
 * resolution avoids an O(spineItems) `findIndex` by reusing a prebuilt
 * href → index map.
 */
export const createStaticChaptersResolver = (
  manifest: Manifest,
  tocIndex: TocIndex,
): StaticChaptersResolver => {
  const spineItemIndexByHref = getSpineItemIndexByHref(manifest)

  // Last write wins, matching the previous `record[item.id] = …` assignment
  // semantics when several spine items share an id.
  const hrefBySpineItemId = new Map<string, string>()
  manifest.spineItems.forEach((item) => {
    hrefBySpineItemId.set(item.id, item.href)
  })

  const cache = new Map<string, ChapterInfo | undefined>()

  return {
    get: (spineItemId) => {
      const cached = cache.get(spineItemId)
      if (cached !== undefined || cache.has(spineItemId)) return cached

      const href = hrefBySpineItemId.get(spineItemId)
      const chapterChain =
        href !== undefined
          ? findChapterChainByHref({ href, tocIndex, spineItemIndexByHref })
          : undefined
      const chapterInfo = chapterChain
        ? buildChapterInfoFromChain(chapterChain)
        : undefined

      cache.set(spineItemId, chapterInfo)

      return chapterInfo
    },
  }
}
