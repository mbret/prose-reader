import type { Manifest } from "@prose-reader/shared"
import type {
  ChapterInfo,
  FlatTocEntry,
  TocCandidatesBySpineHref,
  TocPathEntry,
} from "./types"

type Toc = NonNullable<Manifest["nav"]>["toc"]

export const stripAnchor = (value: string) => {
  const indexOfHash = value.indexOf(`#`)

  return indexOfHash >= 0 ? value.substring(0, indexOfHash) : value
}

const getAnchorId = (value: string | undefined) => {
  if (!value) return undefined

  const hashIndex = value.indexOf(`#`)
  if (hashIndex < 0) return undefined

  const anchor = value.substring(hashIndex + 1)

  return anchor || undefined
}

export const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const flattenToc = (
  toc: Toc,
  chain: TocPathEntry[] = [],
): Pick<FlatTocEntry, "chain" | "href" | "anchorId">[] => {
  return toc.flatMap((item) => {
    const nextChain = [...chain, { title: item.title, path: item.path }]
    const href = item.href || item.path

    return [
      {
        chain: nextChain,
        href,
        anchorId: getAnchorId(item.href) ?? getAnchorId(item.path),
      },
      ...flattenToc(item.contents, nextChain),
    ]
  })
}

const getSpineItemIndexByHref = (manifest: Manifest) => {
  const indexByHref = new Map<string, number>()

  manifest.spineItems.forEach((item, index) => {
    if (!indexByHref.has(item.href)) {
      indexByHref.set(item.href, index)
    }
  })

  return indexByHref
}

export const buildTocIndex = (toc: Toc, manifest: Manifest): FlatTocEntry[] => {
  const spineItemIndexByHref = getSpineItemIndexByHref(manifest)

  return flattenToc(toc).map((entry) => {
    const hrefWithoutAnchor = stripAnchor(entry.href)
    const spineItemIndex = spineItemIndexByHref.get(hrefWithoutAnchor) ?? -1

    return {
      ...entry,
      hrefWithoutAnchor,
      spineItemIndex,
    }
  })
}

/**
 * Build the candidate TOC entries for each spine href.
 *
 * Decision:
 * - We pre-group `tocIndex` once by normalized href (`hrefWithoutAnchor`)
 *   and cache matches per normalized spine href.
 * - This avoids filtering the full `tocIndex` for each spine item, which can
 *   become expensive on books with many anchored TOC entries in the same file.
 *
 * Behavioral guarantees:
 * - Result order still follows original TOC order (via stored entry indices).
 * - Matching logic is unchanged (`hrefMatches*`), so chapter semantics stay
 *   equivalent to the previous implementation.
 */
export const buildTocCandidatesBySpineHref = ({
  manifest,
  tocIndex,
}: {
  manifest: Manifest
  tocIndex: FlatTocEntry[]
}): TocCandidatesBySpineHref => {
  const tocEntryIndicesByNormalizedHref = new Map<string, number[]>()
  tocIndex.forEach((entry, index) => {
    const indices = tocEntryIndicesByNormalizedHref.get(entry.hrefWithoutAnchor)

    if (indices) {
      indices.push(index)
      return
    }

    tocEntryIndicesByNormalizedHref.set(entry.hrefWithoutAnchor, [index])
  })

  const candidatesByHref = new Map<string, FlatTocEntry[]>()
  const candidatesByNormalizedSpineHref = new Map<string, FlatTocEntry[]>()

  for (const spineItem of manifest.spineItems) {
    if (candidatesByHref.has(spineItem.href)) continue

    const spineHrefWithoutAnchor = stripAnchor(spineItem.href)
    let candidates = candidatesByNormalizedSpineHref.get(spineHrefWithoutAnchor)

    if (!candidates) {
      const matchedIndices: number[] = []

      for (const [
        tocHrefWithoutAnchor,
        indices,
      ] of tocEntryIndicesByNormalizedHref) {
        if (
          !hrefMatchesWithoutAnchor(
            spineHrefWithoutAnchor,
            tocHrefWithoutAnchor,
          )
        ) {
          continue
        }

        matchedIndices.push(...indices)
      }

      matchedIndices.sort((a, b) => a - b)
      candidates = matchedIndices.map(
        (index) => tocIndex[index] as FlatTocEntry,
      )
      candidatesByNormalizedSpineHref.set(spineHrefWithoutAnchor, candidates)
    }

    candidatesByHref.set(spineItem.href, candidates)
  }

  return candidatesByHref
}

const hrefMatchesWithoutAnchor = (
  aWithoutAnchor: string,
  bWithoutAnchor: string,
) => {
  return (
    aWithoutAnchor === bWithoutAnchor ||
    aWithoutAnchor.endsWith(bWithoutAnchor) ||
    bWithoutAnchor.endsWith(aWithoutAnchor)
  )
}

export const hrefMatches = (a: string, b: string) => {
  return hrefMatchesWithoutAnchor(stripAnchor(a), stripAnchor(b))
}

export const isPossibleTocItemCandidateForHref = (
  hrefWithoutAnchor: string,
  tocItemHrefWithoutAnchor: string,
) => {
  const hrefIsChapterHref = hrefWithoutAnchor.endsWith(tocItemHrefWithoutAnchor)
  const hrefWithoutFilename = hrefWithoutAnchor.substring(
    0,
    hrefWithoutAnchor.lastIndexOf("/"),
  )
  const tocItemHrefWithoutFilename = tocItemHrefWithoutAnchor.substring(
    0,
    tocItemHrefWithoutAnchor.lastIndexOf("/"),
  )
  const hrefIsWithinChapter =
    hrefWithoutFilename !== "" &&
    hrefWithoutFilename.endsWith(tocItemHrefWithoutFilename)

  return hrefIsChapterHref || hrefIsWithinChapter
}

export const buildChapterInfoFromChain = (
  chain: TocPathEntry[],
): ChapterInfo | undefined => {
  const [head, ...tail] = chain
  if (!head) return undefined

  const chapterInfo: ChapterInfo = {
    title: head.title,
    path: head.path,
  }

  let cursor = chapterInfo as ChapterInfo

  for (const item of tail) {
    const subChapter = {
      title: item.title,
      path: item.path,
    }

    ;(cursor as ChapterInfo).subChapter =
      subChapter as ChapterInfo["subChapter"]
    cursor = subChapter as ChapterInfo
  }

  return chapterInfo
}
