import { Page } from "@playwright/test"
import { Reader } from "@prose-reader/core"

export async function waitForSpineItemReady(page: Page, indexes: number[]) {
  await page.evaluate((args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reader = (window as any).reader as Reader

    return new Promise((resolve) => {
      const checkIndexes = (remainingIndexes: number[]): void => {
        if (remainingIndexes.length === 0) {
          resolve(true)
          return
        }

        const currentIndex = remainingIndexes[0]

        reader.spineItemsManager.get(currentIndex)!.isReady$.subscribe((isReady) => {
          if (isReady) {
            checkIndexes(remainingIndexes.slice(1))
          }
        })
      }

      checkIndexes(args.indexes)
    })
  }, {indexes})
}
