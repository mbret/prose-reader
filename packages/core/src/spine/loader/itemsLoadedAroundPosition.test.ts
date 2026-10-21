// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  holdItemLayout,
  installReaderTestEnvironment,
  mountTestReader,
} from "../../tests/readerHarness"

installReaderTestEnvironment()

afterEach(() => {
  vi.useRealTimers()
})

describe("the items loaded around the position", () => {
  /**
   * The test holds the clock: it runs whatever the reader has scheduled until
   * none is left, so an item that has not loaded or unloaded by then never
   * will.
   */
  it("do not follow a navigation made while a layout is pending until the layout lands", async () => {
    vi.useFakeTimers()

    const pendingLayout = holdItemLayout("/page_1.jpg")
    // The default preload keeps all three items loaded, which would hide a load
    // following the navigation.
    const reader = createTestReader({
      getRenderer: pendingLayout.getRenderer,
      manifest: createPrePaginatedManifest({
        pageSpreads: [undefined, undefined, undefined],
      }),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 0 },
    })

    const loadStatusChanges: string[] = []
    reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
      ({ item, loadStatus }) => {
        loadStatusChanges.push(`${item.index} ${loadStatus}`)
      },
    )

    // The pass lays the first item out, then waits on the second.
    pendingLayout.hold()
    reader.layout()
    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
    await vi.runAllTimersAsync()

    /**
     * Made over the layout being replaced, the navigation's position need not
     * be where the items end up: nothing is loaded or unloaded from it.
     */
    expect(reader.pagination.state.isSettled).toBe(false)
    expect(loadStatusChanges).toEqual([])

    pendingLayout.release()
    await vi.runAllTimersAsync()

    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 2 },
    })
    expect(reader.spineItemsManager.get(2)?.value.loadStatus).toBe("loaded")
  })
})
