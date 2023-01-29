import { Bookmark, ImportableBookmark } from "./types"

export const mapImportableBookmarkToBookmark = (bookmark: ImportableBookmark): Bookmark => {
  return {
    ...bookmark,
    pageIndex: undefined,
    spineItemIndex: undefined,
  }
}

export const mapBookmarkToImportableBookmark = ({ cfi }: Bookmark) => ({
  cfi,
})
