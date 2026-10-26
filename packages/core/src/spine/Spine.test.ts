// @vitest-environment jsdom
import type { Observable } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  resizeObservers,
} from "../tests/readerHarness"

installReaderTestEnvironment()

describe("a destroyed reader", () => {
  /**
   * The test holds the clock: it runs whatever the reader has scheduled until
   * none is left, so an item that has not been laid out by then never will.
   */
  it("lays out none of its items, not even for a layout requested just before", async () => {
    vi.useFakeTimers()

    const reader = createTestReader()

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    // Not immediate, so it still waits to lay the items out at the destroy.
    reader.layout()

    const itemLayoutSpies = reader.spineItemsManager.items.map((item) =>
      vi.spyOn(item, "layout"),
    )

    reader.destroy()
    await vi.runAllTimersAsync()

    expect(itemLayoutSpies.map((spy) => spy.mock.calls.length)).toEqual([0, 0])
  })

  it("completes its layout stream without the pages it was still computing", async () => {
    vi.useFakeTimers()

    const reader = createTestReader()
    const onLayout = vi.fn()
    const onLayoutComplete = vi.fn()

    mountTestReader(reader)
    // The pages of the layout the mount started are still being computed.
    reader.layout$.subscribe({ next: onLayout, complete: onLayoutComplete })
    reader.destroy()
    await vi.runAllTimersAsync()

    expect(onLayout).not.toHaveBeenCalled()
    expect(onLayoutComplete).toHaveBeenCalled()
  })

  it("completes the streams of its items observer, and observes the size of nothing", async () => {
    vi.useFakeTimers()

    const reader = createTestReader()
    const { itemStateChange$, itemResize$, itemLoadStatusChange$ } =
      reader.spineItemsObserver
    const itemStreams: Record<string, Observable<unknown>> = {
      itemStateChange$,
      itemResize$,
      itemLoadStatusChange$,
    }
    const completedItemStreams: string[] = []

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    for (const [name, itemStream$] of Object.entries(itemStreams)) {
      itemStream$.subscribe({ complete: () => completedItemStreams.push(name) })
    }
    reader.destroy()

    expect([...completedItemStreams].sort()).toEqual([
      "itemLoadStatusChange$",
      "itemResize$",
      "itemStateChange$",
    ])
    expect(resizeObservers().watching).toBe(0)
  })
})
