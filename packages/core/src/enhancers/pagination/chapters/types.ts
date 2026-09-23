/**
 * A table of contents entry, nested down to the most specific entry. The toc
 * has no depth limit, so neither does the chain.
 */
export type ChapterInfo = {
  title: string
  path: string
  subChapter?: ChapterInfo
}

export type TocPathEntry = {
  title: string
  path: string
}

export type FlatTocEntry = {
  chain: TocPathEntry[]
  href: string
  hrefWithoutAnchor: string
  anchorId: string | undefined
  spineItemIndex: number
}

export type TocIndex = FlatTocEntry[]

export type TocCandidatesBySpineHref = Map<string, FlatTocEntry[]>
