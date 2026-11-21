// @vitest-environment jsdom
import { skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  installReaderTestEnvironment,
  mountTestReader,
  notifyResize,
  resizeObservers,
  setTestViewport,
  settledOn,
} from "../tests/readerHarness.ts"

installReaderTestEnvironment()

/**
 * A mounted book of four pages, with what `navigationRequest$` and
 * `navigation$` tell from now on, in the order they tell it.
 */
const openAndRecordRequestsAndNavigations = async () => {
  const reader = createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: [undefined, undefined, undefined, undefined],
    }),
  })

  mountTestReader(reader)
  await settledOn(reader, 0)

  const told: string[] = []
  let hasCompleted = false

  reader.navigation.navigationRequest$.subscribe({
    next: ({ target }) => {
      told.push(`request for ${target.type} ${String(target.value)}`)
    },
    complete: () => {
      hasCompleted = true
    },
  })
  // The first one is the latest navigation, replayed.
  reader.navigation.navigation$.pipe(skip(1)).subscribe(({ triggeredBy }) => {
    told.push(`navigation from ${triggeredBy}`)
  })

  return { reader, told, hasCompleted: () => hasCompleted }
}

describe("navigationRequest$", () => {
  it("tells a request once the reader has made its navigation", async () => {
    const { reader, told } = await openAndRecordRequestsAndNavigations()

    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })

    expect(told).toEqual(["navigation from user", "request for spineItem 2"])
  })

  it("does not tell a request whose target names nothing in the book", async () => {
    const { reader, told } = await openAndRecordRequestsAndNavigations()

    reader.navigation.navigate({
      target: { type: "spineItem", value: 99 },
      animation: false,
    })

    expect(told).toEqual([])
  })

  it("tells a request made while the container is hidden, which waits for the container to be shown", async () => {
    const { reader, told } = await openAndRecordRequestsAndNavigations()

    const viewportElement = reader.viewport.value.element
    const observersOfViewportBefore = resizeObservers(viewportElement).watching

    setTestViewport({ width: 0, height: 0 })
    notifyResize()
    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })

    expect(told, "what is told while the container is hidden").toEqual([
      "request for spineItem 2",
    ])

    // The request observes the size of the viewport from a later frame.
    await vi.waitFor(() => {
      expect(
        resizeObservers(viewportElement).watching,
        "the observers of the viewport",
      ).toBeGreaterThan(observersOfViewportBefore)
    })
    setTestViewport(defaultTestViewport)
    notifyResize()
    await settledOn(reader, 2)

    expect(told[1], "what is told once the container is shown").toBe(
      "navigation from user",
    )
  })

  it("completes when the reader is destroyed, and tells no request after", async () => {
    const { reader, told, hasCompleted } =
      await openAndRecordRequestsAndNavigations()

    reader.destroy()
    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })

    expect(hasCompleted()).toBe(true)
    expect(told).toEqual([])
  })
})
