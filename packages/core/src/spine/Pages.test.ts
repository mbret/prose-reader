// @vitest-environment jsdom
import { first, NEVER, skip } from "rxjs"
import { describe, expect, it, onTestFinished } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/**
 * The frames from the mount until the pages of the first completed pass are
 * published, in a spine of `numberOfItems` pre-paginated items whose
 * documents never load. The test runs the frames itself, about one every
 * 16 ms, so it counts frames that pass rather than requests for one.
 */
const countFramesToPublishFirstPages = async (numberOfItems: number) => {
  const reader = createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: Array.from({ length: numberOfItems }, () => undefined),
    }),
    getResource: () => NEVER,
  })
  const frameCallbacks = new Map<number, FrameRequestCallback>()
  let lastFrameRequestId = 0

  // Only these two: the harness stubs other globals, such as ResizeObserver.
  const { requestAnimationFrame, cancelAnimationFrame } = globalThis

  onTestFinished(() => {
    globalThis.requestAnimationFrame = requestAnimationFrame
    globalThis.cancelAnimationFrame = cancelAnimationFrame
  })
  globalThis.requestAnimationFrame = (callback) => {
    lastFrameRequestId += 1
    frameCallbacks.set(lastFrameRequestId, callback)

    return lastFrameRequestId
  }
  globalThis.cancelAnimationFrame = (id) => {
    frameCallbacks.delete(id)
  }

  let isFirstPagesPublished = false

  reader.spine.pages.pipe(skip(1), first()).subscribe(() => {
    isFirstPagesPublished = true
  })

  mountTestReader(reader)

  let frames = 0

  while (!isFirstPagesPublished) {
    if (frames > 1000) throw new Error("the pages were never published")

    await new Promise((resolve) => setTimeout(resolve, 16))

    const callbacksOfThisFrame = [...frameCallbacks.values()]

    frameCallbacks.clear()
    frames += 1
    callbacksOfThisFrame.forEach((callback) => {
      callback(performance.now())
    })
  }

  expect(
    reader.spineItemsManager.items.filter(
      ({ value }) => value.loadStatus === "loaded",
    ),
    "the items with a document",
  ).toEqual([])

  return frames
}

describe("Pages", () => {
  it("publishes the pages of items without a document in as many frames, however many there are", async () => {
    const framesForAFewItems = await countFramesToPublishFirstPages(20)
    const framesForManyItems = await countFramesToPublishFirstPages(200)

    // Precondition: the pages wait for a frame.
    expect(framesForAFewItems, "the frames for a few items").toBeGreaterThan(0)

    /**
     * Only a page with a document has a first visible node to search: the
     * pages of the others wait for no frame of their own.
     */
    expect(framesForManyItems, "the frames for ten times as many items").toBe(
      framesForAFewItems,
    )
  })
})
