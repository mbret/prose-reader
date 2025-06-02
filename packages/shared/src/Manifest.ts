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
  renditionSpread:
    | `none`
    | `landscape`
    | `portrait`
    | `both`
    | `auto`
    | undefined
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
     *
     * Although not mandatory it is recommended to match what is used within the documents such as <a href="...">. so that
     * navigation can be handled correctly.
     *
     * So let's say your href target a streaming server, you can use whatever base url but this would be recommended to use the same
     * relative path as the one used within the document.
     *
     * In the perfect scenario where you are on the web you can have:
     * - href that targets a resource directly (which can be used as source by the reader iframes)
     * - href pathname that reflect the same path as the book documents.
     *
     * In the case you cannot follow this, there are several tools you can use to intercept resources fetching, navigation, etc.
     *
     * Ultimately, href have to make sense for either the reader or you since they are the primary means of mapping.
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
