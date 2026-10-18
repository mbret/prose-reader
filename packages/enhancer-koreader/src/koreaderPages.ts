import type { Manifest } from "@prose-reader/shared"

type SpineItem = Manifest["spineItems"][number]

/**
 * The pages KOReader shows for a book it opens with pages, matched to the
 * spine items showing them. Page numbers are 1-based, as KOReader's.
 */
export type KoreaderPages = {
  /** The page a spine item shows. */
  getPageOfSpineItem: (spineItem: SpineItem) => number | undefined
  /** The first spine item, in reading order, showing a page. */
  getSpineItemIndexOfPage: (page: number) => number | undefined
}

/**
 * Page `N` is the `N`th archive record the book shows, in reading order: a
 * PDF's page, a comic's image. Both halves of a split panorama show the
 * panorama's record, so they share its page, as KOReader shows the panorama
 * as one.
 *
 * This takes prose's reading order and records for KOReader's. KOReader
 * sorts a comic's images by name and skips entries that are not images,
 * which prose does not do yet (#535).
 */
const getPagesOfSpineItems = (manifest: Manifest) => {
  const pageByContainerUri = new Map<string, number>()

  return manifest.spineItems.map(({ containerUri }) => {
    const page =
      pageByContainerUri.get(containerUri) ?? pageByContainerUri.size + 1

    pageByContainerUri.set(containerUri, page)

    return page
  })
}

const koreaderPagesByManifest = new WeakMap<Manifest, KoreaderPages>()

/**
 * The pages of a book KOReader opens with pages, a PDF or a comic archive,
 * computed once per manifest.
 */
export const getKoreaderPages = (manifest: Manifest): KoreaderPages => {
  const known = koreaderPagesByManifest.get(manifest)

  if (known) return known

  const pagesOfSpineItems = getPagesOfSpineItems(manifest)
  const koreaderPages: KoreaderPages = {
    getPageOfSpineItem: (spineItem) => pagesOfSpineItems[spineItem.index],
    getSpineItemIndexOfPage: (page) => {
      const spineItemIndex = pagesOfSpineItems.indexOf(page)

      return spineItemIndex < 0 ? undefined : spineItemIndex
    },
  }

  koreaderPagesByManifest.set(manifest, koreaderPages)

  return koreaderPages
}
