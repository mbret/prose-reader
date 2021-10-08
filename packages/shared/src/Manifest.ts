export type TocItem = {
  title: string,
  path: string,
  contents: TocItem[],
  href: string,
}

export type Manifest = {
  filename: string,
  nav: {
    toc: TocItem[]
  },
  title: string
  renditionLayout:  `reflowable` | `pre-paginated` | undefined,
  renditionSpread: `none` | `landscape` | `portrait` | `both` | `auto` | undefined,
  readingDirection: 'ltr' | 'rtl',
  readingOrder: {
    id: string,
    href: string,
    path: string,
    renditionLayout: `reflowable` | `pre-paginated`,
    progressionWeight: number,
    pageSpreadLeft: true | undefined,
    pageSpreadRight: true | undefined,
    encodingFormat?: string,
  }[]
}