// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
} from "../../tests/readerHarness"
import type { BoundaryReachedEvent } from "./boundary"

installReaderTestEnvironment()

afterEach(() => {
  vi.useRealTimers()
})

/**
 * A mounted reader on its last page, recording every boundary event. The test
 * holds the clock: `settle` runs whatever the reader has scheduled until none
 * is left, so an event that has not been recorded by then never will be.
 */
const onLastPage = async () => {
  vi.useFakeTimers()

  const reader = createTestReader()
  const boundaries: BoundaryReachedEvent[] = []
  reader.navigation.outOfSpineBoundary$.subscribe((event) => {
    boundaries.push(event)
  })

  const settle = async () => {
    await vi.runAllTimersAsync()

    return reader.pagination.state
  }

  mountTestReader(reader)
  reader.navigation.goToSpineItem({ indexOrId: 1 })

  expect(await settle()).toMatchObject({
    isSettled: true,
    begin: { spineItemIndex: 1 },
  })

  return { reader, boundaries, settle }
}

describe("Given a reader on the last page", () => {
  it("does not report a boundary for turning back and forward again", async () => {
    const { reader, boundaries, settle } = await onLastPage()

    reader.navigation.turnLeft()

    expect(await settle()).toMatchObject({ begin: { spineItemIndex: 0 } })

    reader.navigation.turnRight()

    expect(await settle()).toMatchObject({ begin: { spineItemIndex: 1 } })
    expect(boundaries).toEqual([])
  })

  // Without this one, the test above would pass for a reader that never
  // reports anything.
  it("reports the end for turning past it", async () => {
    const { reader, boundaries, settle } = await onLastPage()

    reader.navigation.turnRight()

    expect(await settle()).toMatchObject({ begin: { spineItemIndex: 1 } })
    expect(boundaries).toEqual([{ boundary: "end" }])
  })
})
