// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createEnhancedTestReader,
  installReaderTestEnvironment,
  mountTestReader,
} from "../../tests/readerHarness"

installReaderTestEnvironment()

afterEach(() => {
  vi.useRealTimers()
})

describe("a resource located on a reader destroyed while it consolidates", () => {
  it("completes without the metadata it was still consolidating", async () => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("the book has no second item")

    const onLocated = vi.fn()
    const onComplete = vi.fn()

    reader
      .locateResource(item)
      .subscribe({ next: onLocated, complete: onComplete })
    // The locator sets up on an idle callback, then consolidates on another.
    await vi.advanceTimersByTimeAsync(1)
    reader.destroy()
    await vi.runAllTimersAsync()

    expect(onLocated).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()
  })
})
