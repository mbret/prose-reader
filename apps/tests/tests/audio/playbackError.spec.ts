import { expect, type Page, test } from "@playwright/test"
import type { AudioEnhancedReader } from "@prose-reader/enhancer-audio"

const readAudioState = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as AudioEnhancedReader

    return reader.audio.state
  })

test("reports an error once the track the user asked to play turns out to be undecodable", async ({
  page,
}) => {
  await page.goto("http://localhost:3333/tests/audio/index.html")

  await page.getByRole("button", { name: "Play" }).click()

  await expect
    .poll(async () => {
      const { currentTrack, isLoading } = await readAudioState(page)

      return { currentTrackId: currentTrack?.id, isLoading }
    })
    .toEqual({ currentTrackId: `track`, isLoading: true })

  await page.evaluate(() => {
    // @ts-expect-error window.releaseTrackResource is set by this scenario's index.tsx
    window.releaseTrackResource()
  })

  await expect
    .poll(async () => (await readAudioState(page)).hasError)
    .toBe(true)

  expect(
    await page.evaluate(
      // @ts-expect-error window.playRejectionNames is set by this scenario's index.tsx
      () => window.playRejectionNames,
    ),
  ).toEqual([`NotSupportedError`])
  expect(await readAudioState(page)).toMatchObject({
    isLoading: false,
    isPlaying: false,
  })
})
