// @vitest-environment jsdom
import { firstValueFrom, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"
import type { Navigation } from "./types"

installReaderTestEnvironment()

type TestReader = ReturnType<typeof createTestReader>

/** The navigation that holds on the current layout, now: it is replayed. */
const getHeldNavigation = (reader: TestReader) => {
  const replayed: (Navigation | undefined)[] = []

  reader.navigation.internalNavigator.navigationOverCurrentLayout$
    .subscribe((navigation) => {
      replayed.push(navigation)
    })
    .unsubscribe()

  // `undefined` is an answer, nothing replayed is not.
  expect(replayed).toHaveLength(1)

  return replayed[0]
}

const getLatestNavigation = (reader: TestReader) =>
  firstValueFrom(reader.navigation.navigation$)

describe("the navigation that holds on the current layout", () => {
  it("is nothing before the reader is first laid out", () => {
    // The navigator already has its initial navigation, and no pages exist.
    expect(getHeldNavigation(createTestReader())).toBeUndefined()
  })

  it("is nothing from the moment a layout is requested and once its pages land, then the navigation restored onto them", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const heldNavigations: (Navigation | undefined)[] = []
    reader.navigation.internalNavigator.navigationOverCurrentLayout$
      // the replayed one
      .pipe(skip(1))
      .subscribe((navigation) => {
        heldNavigations.push(navigation)
      })

    reader.layout()
    await settledOn(reader, 0)

    const restored = await getLatestNavigation(reader)

    /**
     * The request replaces the layout the navigation was made over, and the
     * pages landing make current a layout it was not restored onto yet. Only
     * the restoration that follows holds.
     */
    expect(heldNavigations.slice(0, 3)).toEqual([
      undefined,
      undefined,
      restored,
    ])
    expect(restored.triggeredBy).toBe("restoration")
    expect(getHeldNavigation(reader)).toBe(restored)
  })

  it("is nothing for a navigation made while a layout is pending", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    // A layout is pending from the moment it is requested.
    reader.layout()
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    const navigation = await getLatestNavigation(reader)

    // The navigation has been made, over the layout being replaced.
    expect(navigation.triggeredBy).toBe("user")
    expect(reader.spine.isLayoutCurrent).toBe(false)
    expect(getHeldNavigation(reader)).toBeUndefined()

    await settledOn(reader, 1)

    expect(getHeldNavigation(reader)).toBe(await getLatestNavigation(reader))
  })

  it("is up to date before anything built after the navigator hears of the navigation that changes it", async () => {
    const reader = createTestReader()

    /**
     * Pagination settles a result only if, when it resolves a navigation, that
     * navigation is the one held. As each navigation is heard of, the held one
     * must already say whether it holds: it does exactly while the layout is
     * current. Waits are on navigations, not on settlement, which this order
     * is a condition of.
     */
    const heardNavigations: {
      triggeredBy: Navigation["triggeredBy"]
      isHeld: boolean
      isLayoutCurrent: boolean
    }[] = []
    reader.navigation.navigation$.subscribe((navigation) => {
      heardNavigations.push({
        triggeredBy: navigation.triggeredBy,
        isHeld: getHeldNavigation(reader) === navigation,
        isLayoutCurrent: reader.spine.isLayoutCurrent,
      })
    })
    const restorationsOntoACurrentLayout = () =>
      heardNavigations.filter(
        ({ triggeredBy, isLayoutCurrent }) =>
          triggeredBy === "restoration" && isLayoutCurrent,
      ).length

    mountTestReader(reader)
    await vi.waitFor(() =>
      expect(restorationsOntoACurrentLayout()).toBeGreaterThan(0),
    )

    const restorationsBefore = restorationsOntoACurrentLayout()

    // A navigation made while a layout is pending, then restored onto it.
    reader.layout()
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await vi.waitFor(() =>
      expect(restorationsOntoACurrentLayout()).toBeGreaterThan(
        restorationsBefore,
      ),
    )

    expect(heardNavigations).toContainEqual({
      triggeredBy: "user",
      isHeld: false,
      isLayoutCurrent: false,
    })
    expect(
      heardNavigations.filter(
        ({ isHeld, isLayoutCurrent }) => isHeld !== isLayoutCurrent,
      ),
    ).toEqual([])
  })
})
