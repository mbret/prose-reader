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
  renditionFlow?: `scrolled-continuous` | `scrolled-doc` | `paginated` | `auto`,
  renditionSpread: `none` | `landscape` | `portrait` | `both` | `auto` | undefined,
  readingDirection: 'ltr' | 'rtl',
  /**
   * legacy 
   * @see https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf2-guide
   */
  guide?: {
    type: `cover` | `title-page` | `copyright-page` | `text`,
    title: string
    href: string
  }[],
  readingOrder: {
    id: string,
    href: string,
    path: string,
    renditionLayout: `reflowable` | `pre-paginated`,
    progressionWeight: number,
    pageSpreadLeft: true | undefined,
    pageSpreadRight: true | undefined,
    // encodingFormat?: string,
    mediaType?: string
  }[],
  items: {
    id: string,
    href: string,
    mediaType?: string
  }[]
}