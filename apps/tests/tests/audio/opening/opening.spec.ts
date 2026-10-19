import { expect, type Page, test } from "@playwright/test"
import type { AudioEnhancedReader } from "@prose-reader/enhancer-audio"
import { getReader } from "../../utils/reader"

const url = "http://localhost:3333/tests/audio/opening/index.html"

const readOpeningState = async (page: Page) =>
  (await getReader<AudioEnhancedReader>(page)).evaluate((reader) => ({
    beginSpineItemIndex: reader.pagination.state.begin.spineItemIndex,
    currentTrackId: reader.audio.state.currentTrack?.id,
  }))

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
