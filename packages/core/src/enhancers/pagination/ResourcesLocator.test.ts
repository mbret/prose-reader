// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import {
  createEnhancedTestReader,
  installReaderTestEnvironment,
  mountTestReader,
} from "../../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"

installReaderTestEnvironment()

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

describe("a resource located on a reader destroyed before the locator sets up", () => {
  it.each([
    ["one resource", false],
    ["a list of resources", true],
  ])("completes as the reader is destroyed, given %s", async (_, asList) => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("the book has no second item")

    const onLocated = vi.fn()
    const onComplete = vi.fn()
    const observer = { next: onLocated, complete: onComplete }

    if (asList) {
      reader.locateResource([item]).subscribe(observer)
    } else {
      reader.locateResource(item).subscribe(observer)
    }

    reader.destroy()

    expect(onComplete).toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(onLocated).not.toHaveBeenCalled()
  })
})

describe("a reflowable item located away from the reading position", () => {
  it("stays loaded while it is located, and for a second after", async () => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: createTestManifestSpineItems(3),
      }),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const locatedItem = reader.spineItemsManager.get(2)

    if (!locatedItem) throw new Error("the book has no third item")

    const loadStatusBeforeLocating = locatedItem.value.loadStatus
    const locateResourceSubscription = reader
      .locateResource(locatedItem)
      .subscribe()

    await vi.runAllTimersAsync()
    const loadStatusWhileLocated = locatedItem.value.loadStatus

    locateResourceSubscription.unsubscribe()
    await vi.advanceTimersByTimeAsync(999)
    const loadStatusJustBeforeASecond = locatedItem.value.loadStatus

    await vi.runAllTimersAsync()

    expect({
      loadStatusBeforeLocating,
      loadStatusWhileLocated,
      loadStatusJustBeforeASecond,
      loadStatusAfterASecond: locatedItem.value.loadStatus,
    }).toEqual({
      loadStatusBeforeLocating: "idle",
      loadStatusWhileLocated: "loaded",
      loadStatusJustBeforeASecond: "loaded",
      loadStatusAfterASecond: "idle",
    })
  })
})
