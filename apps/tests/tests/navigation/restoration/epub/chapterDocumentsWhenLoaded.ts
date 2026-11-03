import type { Reader } from "@prose-reader/core"

/** What a chapter's document holds as the reader reports it loaded. */
export type ChapterDocumentWhenLoaded = {
  itemIndex: number
  stylesheets: { reference: string | null; hasSheet: boolean }[]
  fonts: { family: string; status: FontFaceLoadStatus }[]
}

/**
 * Records each chapter's document as the reader reports it loaded, from the
 * reader's creation on, earlier than a spec can subscribe: chapters that load
 * at once share the first request for their stylesheet.
 */
export const recordChapterDocumentsWhenLoaded = (reader: Reader) => {
  const chapterDocuments: ChapterDocumentWhenLoaded[] = []

  reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
    ({ item, loadStatus }) => {
      if (loadStatus !== "loaded") return

      const document = item.loadedDocument
      const fonts: ChapterDocumentWhenLoaded["fonts"] = []

      document?.fonts.forEach(({ family, status }) => {
        fonts.push({ family: family.replace(/["']/g, ""), status })
      })

      chapterDocuments.push({
        itemIndex: item.index,
        stylesheets: Array.from(
          document?.querySelectorAll<HTMLLinkElement>(
            `link[rel~="stylesheet" i]`,
          ) ?? [],
          (link) => ({
            reference: link.getAttribute("href"),
            hasSheet: !!link.sheet,
          }),
        ),
        fonts,
      })
    },
  )

  return chapterDocuments
}
