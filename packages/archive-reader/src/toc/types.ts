/**
 * One entry of an archive's resolved table of contents.
 *
 * The entry is container-relative and serving-agnostic: no base URL is baked
 * in, so the same object can be consumed by a streamer (which joins its own
 * base URL), a bookshelf UI, or any other tool reading the archive directly.
 */
export type ArchiveTocItem = {
  title: string
  /**
   * Reference to the target as authored in the source: a container path with
   * an optional `#fragment` for nav/NCX documents, or the raw record `uri`
   * for folder-derived TOCs. Empty when the entry has no target (e.g. a nav
   * `<span>` heading without a link).
   */
  path: string
  /**
   * Container-relative URI reference for the target, safe to resolve against
   * a base URL. Same as `path` for nav/NCX sources (their references are
   * already URIs), percent-encoded form of `path` for folder-derived TOCs.
   * Empty when the entry has no target.
   */
  href: string
  contents: ArchiveTocItem[]
}
