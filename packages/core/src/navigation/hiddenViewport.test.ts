// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  installReaderTestEnvironment,
  mountTestReader,
  notifyResize,
  setTestViewport,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/** Longer than anything a navigation or a layout waits for. */
const LONGER_THAN_ANY_WAIT = 1000

/**
 * A container hidden under `display: none` measures 0 by 0, and so does every
 * element in it, the items' documents included.
 */
describe("Given a mounted reader whose container is hidden", () => {
  it("holds a navigation until the container is shown, then runs only the latest one", async () => {
    // from the reader's creation, so every wait it schedules runs on it
    vi.useFakeTimers()

    const reader = createTestReader({
      manifest: createPrePaginatedManifest({
        pageSpreads: [undefined, undefined, undefined],
      }),
      pageTurnAnimation: "none",
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 0 },
    })

    /** The item of every page the pagination settles on from now on. */
    const settledSpineItems: (number | undefined)[] = []
    let isReplayingCurrentState = true

    reader.pagination.state$.subscribe(({ isSettled, begin }) => {
      if (isReplayingCurrentState || !isSettled) return

      settledSpineItems.push(begin.spineItemIndex)
    })
    isReplayingCurrentState = false

    setTestViewport({ width: 0, height: 0 })
    notifyResize()
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
    await vi.advanceTimersByTimeAsync(LONGER_THAN_ANY_WAIT)

    expect(settledSpineItems).toEqual([])
    expect(reader.pagination.state.begin.spineItemIndex).toBe(0)

    setTestViewport(defaultTestViewport)
    notifyResize()
    await vi.advanceTimersByTimeAsync(LONGER_THAN_ANY_WAIT)

    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 2 },
    })
    expect(settledSpineItems).not.toContain(1)
  })
})
