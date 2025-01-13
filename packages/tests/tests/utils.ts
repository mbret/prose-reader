import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

export async function waitForSpineItemReady(page: Page, indexes: number[]) {
  await page.evaluate(
    (args) => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const reader = (window as any).reader as Reader

      return new Promise((resolve) => {
        const checkIndexes = (remainingIndexes: number[]): void => {
          if (remainingIndexes.length === 0) {
            resolve(true)
            return
          }

          const currentIndex = remainingIndexes[0]

          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          reader.spineItemsManager
            .get(currentIndex)!
            .isReady$.subscribe((isReady) => {
              if (isReady) {
                checkIndexes(remainingIndexes.slice(1))
              }
            })
        }

        checkIndexes(args.indexes)
      })
    },
    { indexes },
  )
}
