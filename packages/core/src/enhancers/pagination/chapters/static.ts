import type { Manifest } from "@prose-reader/shared"
import {
  buildChapterInfoFromChain,
  buildTocIndex,
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
  manifest,
}: {
  href: string
  tocIndex: FlatTocEntry[]
  manifest: Manifest
}): TocPathEntry[] | undefined => {
  const hrefWithoutAnchor = stripAnchor(href)
  const hrefHasAnchor = href.includes(`#`)
  const spineItemIndex = manifest.spineItems.findIndex(
    (item) => item.href === hrefWithoutAnchor,
  )

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
  const chapterChain = findChapterChainByHref({ href, tocIndex, manifest })

  return chapterChain ? buildChapterInfoFromChain(chapterChain) : undefined
}

const buildChapterInfoFromSpineItem = (
  manifest: Manifest,
  tocIndex: TocIndex,
  item: Manifest[`spineItems`][number],
) => {
  const { href } = item

  const chapterChain = findChapterChainByHref({ href, tocIndex, manifest })

  return chapterChain ? buildChapterInfoFromChain(chapterChain) : undefined
}

export const buildStaticChaptersInfo = (
  manifest: Manifest,
  tocIndex: TocIndex,
): { [key: string]: ChapterInfo | undefined } => {
  if (!manifest) return {}

  const chaptersInfo = manifest.spineItems.reduce(
    (acc, item) => {
      acc[item.id] = buildChapterInfoFromSpineItem(manifest, tocIndex, item)

      return acc
    },
    {} as { [key: string]: ChapterInfo | undefined },
  )

  return chaptersInfo
}
