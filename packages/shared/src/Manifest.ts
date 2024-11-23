export type TocItem = {
  title: string
  path: string
  contents: TocItem[]
  href: string
}

export type Manifest = {
  filename: string
  /**
   * @see https://www.w3.org/publishing/epub3/epub-packages.html#sec-nav-toc
   */
  nav?: {
    toc: TocItem[]
  }
  title: string
  renditionLayout: `reflowable` | `pre-paginated` | undefined
  renditionFlow?: `scrolled-continuous` | `scrolled-doc` | `paginated` | `auto`
  renditionSpread: `none` | `landscape` | `portrait` | `both` | `auto` | undefined
  readingDirection: "ltr" | "rtl"
  /**
   * legacy
   * @see https://www.w3.org/publishing/epub3/epub-packages.html#sec-opf2-guide
   */
  guide?: {
    type: `cover` | `title-page` | `copyright-page` | `text`
    title: string
    href: string
  }[]
  spineItems: {
    id: string
    index: number
    /**
     * IRI https://www.rfc-editor.org/rfc/rfc3987
     *
     * This IRI may contain a baseUrl to satisfy whatever hosting scheme.
     *
     * @example
     * http://localhost:9000/streamer/ZmlsZTovL2VwdWJzL3BhdGhmaW5kZXJfdm9sMS5lcHVi/OEBPS/p002.xhtml
     */
    href: string
    /**
     * @see https://www.w3.org/TR/epub-33/#property-layout-global
     */
    renditionLayout?: `reflowable` | `pre-paginated`
    progressionWeight?: number
    pageSpreadLeft?: true | undefined
    pageSpreadRight?: true | undefined
    // encodingFormat?: string,
    mediaType?: string
  }[]
  items: {
    id: string
    href: string
    mediaType?: string
  }[]
}
