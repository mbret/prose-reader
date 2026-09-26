import { expect, type Page, test } from "@playwright/test"
import type { AudioEnhancedReader } from "@prose-reader/enhancer-audio"

const url = "http://localhost:3333/tests/audio/opening/index.html"

const readOpeningState = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as AudioEnhancedReader | undefined

    if (!reader) return undefined

    return {
      beginSpineItemIndex: reader.pagination.state.begin.spineItemIndex,
      currentTrackId: reader.audio.state.currentTrack?.id,
    }
  })

test("the track the book opens on is the current one, before any user action", async ({
  page,
}) => {
  await page.goto(url)

  await expect
    .poll(() => readOpeningState(page))
    .toEqual({ beginSpineItemIndex: 0, currentTrackId: `track-1` })
})

test("the track the book is restored at is the current one, before any user action", async ({
  page,
}) => {
  await page.goto(`${url}?spineItem=track-2`)

  await expect
    .poll(() => readOpeningState(page))
    .toEqual({ beginSpineItemIndex: 1, currentTrackId: `track-2` })
})
