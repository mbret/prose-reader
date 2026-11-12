// @vitest-environment jsdom
import { first, firstValueFrom, NEVER, skip, switchMap } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/**
 * The frames the pages of the first completed pass take to publish, in a
 * spine of `numberOfItems` pre-paginated items whose documents never load.
 */
const countFramesToPublishFirstPages = async (numberOfItems: number) => {
  const reader = createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: Array.from({ length: numberOfItems }, () => undefined),
    }),
    getResource: () => NEVER,
  })
  const { spineLayout } = reader.spine.pages
  let framesRequested = 0
  let isCountingFrames = false
  const requestAnimationFrame = window.requestAnimationFrame.bind(window)

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    if (isCountingFrames) framesRequested += 1

    return requestAnimationFrame(callback)
  })

  const firstPagesPublished = firstValueFrom(
    spineLayout.layout$.pipe(
      first(),
      switchMap(() => {
        isCountingFrames = true

        return reader.spine.pages.pipe(skip(1), first())
      }),
    ),
  )

  mountTestReader(reader)
  await firstPagesPublished

  expect(
    reader.spineItemsManager.items.filter(
      ({ value }) => value.loadStatus === "loaded",
    ),
    "the items with a document",
  ).toEqual([])

  vi.restoreAllMocks()

  return framesRequested
}

describe("Pages", () => {
  it("publishes the pages of items without a document in as many frames, however many there are", async () => {
    const framesForAFewItems = await countFramesToPublishFirstPages(20)
    const framesForManyItems = await countFramesToPublishFirstPages(200)

    /**
     * Only a page with a document has a first visible node to search: the
     * pages of the others wait for no frame of their own.
     */
    expect(framesForManyItems, "the frames for ten times as many items").toBe(
      framesForAFewItems,
    )
  })
})
