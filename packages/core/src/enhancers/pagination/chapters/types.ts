export type ChapterInfo = {
  title: string
  subChapter?: {
    title: string
    subChapter?: {
      title: string
      subChapter?: {
        title: string
        path: string
      }
      path: string
    }
    path: string
  }
  path: string
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
