import type { Page } from "@playwright/test"
import type { Reader, ReadingPosition } from "@prose-reader/core"
import type { koreaderEnhancer } from "@prose-reader/enhancer-koreader"
import { waitForSettled } from "./pagination"
import { getReader } from "./reader"

/** The reader of the KOReader scenarios, built with the KOReader enhancer. */
type KoreaderReader = ReturnType<ReturnType<typeof koreaderEnhancer>> & Reader

/**
 * The reading position as a KOReader sync client pushes it, with the spine
 * item it names and the archive record that item shows.
 */
export type KoreaderReadingPosition = {
  status: ReadingPosition["status"]
  progress: string | undefined
  spineItemIndex: number | undefined
  containerUri: string | undefined
}

export const readKoreaderReadingPosition = async (page: Page) =>
  (await getReader<KoreaderReader>(page)).evaluate(
    (reader): KoreaderReadingPosition => {
      let position: ReadingPosition | undefined

      reader.navigation.readingPosition$
        .subscribe((value) => {
          position = value
        })
        .unsubscribe()

      if (!position) throw new Error("no reading position")

      const spineItem = reader.cfi.getSpineItemFromCfi(position.cfi)

      return {
        status: position.status,
        progress: reader.koreader.cfiToProgress(position.cfi),
        spineItemIndex: spineItem?.item.index,
        containerUri: spineItem?.item.containerUri,
      }
    },
  )

/** Goes to a KOReader `progress`, as a sync client applies a pulled one. */
export const goToKoreaderProgress = async (page: Page, progress: string) => {
  const reader = await getReader<KoreaderReader>(page)

  await reader.evaluate((reader, progress) => {
    reader.navigation.goToKoreaderProgress(progress)
  }, progress)
  await waitForSettled(page)
}
