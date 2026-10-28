// @vitest-environment jsdom
import { first, firstValueFrom, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"
import type { Navigation, NavigationAgainstCurrentLayout } from "./types"

installReaderTestEnvironment()

type TestReader = ReturnType<typeof createTestReader>

/** The latest navigation as the navigator reports it now: it is replayed. */
const getNavigationAgainstCurrentLayout = (reader: TestReader) => {
  const replayed: NavigationAgainstCurrentLayout[] = []

  reader.navigation.navigationAgainstCurrentLayout$
    .subscribe((navigationAgainstCurrentLayout) => {
      replayed.push(navigationAgainstCurrentLayout)
    })
    .unsubscribe()

  expect(replayed).toHaveLength(1)

  return replayed[0]
}

const getLastNavigationMade = (reader: TestReader) =>
  firstValueFrom(reader.navigation.navigation$)

describe("the navigation against the current layout", () => {
  it("does not hold before the reader is first laid out", async () => {
    const reader = createTestReader()

    // The navigator already has its initial navigation, and no pages exist.
    const reported = getNavigationAgainstCurrentLayout(reader)

    expect(reported?.navigation).toBe(await getLastNavigationMade(reader))
    expect(reported?.holdsOnCurrentLayout).toBe(false)
  })

  it("stops holding from the moment a layout is requested, and still once its pages land, until the navigation is restored onto them", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const before = await getLastNavigationMade(reader)
    const reports: NavigationAgainstCurrentLayout[] = []
    reader.navigation.navigationAgainstCurrentLayout$
      // the replayed one
      .pipe(skip(1))
      .subscribe((navigationAgainstCurrentLayout) => {
        reports.push(navigationAgainstCurrentLayout)
      })

    reader.layout()
    await settledOn(reader, 0)

    const restored = await getLastNavigationMade(reader)

    /**
     * The request replaces the layout the navigation was made over, and the
     * pages landing make current a layout it was not restored onto yet: each
     * voids it, and reports it again. Only the restoration that follows
     * holds.
     */
    expect(restored.triggeredBy).toBe("restoration")
    expect(
      reports
        .slice(0, 3)
        .map(({ navigation, holdsOnCurrentLayout }) => [
          navigation === before ? "before" : navigation === restored,
          holdsOnCurrentLayout,
        ]),
    ).toEqual([
      ["before", false],
      ["before", false],
      [true, true],
    ])
  })

  it("does not hold when made while a layout is pending", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    // A layout is pending from the moment it is requested.
    reader.layout()
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    const navigation = await getLastNavigationMade(reader)
    const reported = getNavigationAgainstCurrentLayout(reader)

    // The navigation has been made, over the layout being replaced.
    expect(navigation.triggeredBy).toBe("user")
    expect(reader.spine.isLayoutCurrent).toBe(false)
    expect(reported?.navigation).toBe(navigation)
    expect(reported?.holdsOnCurrentLayout).toBe(false)

    await settledOn(reader, 1)

    const restored = getNavigationAgainstCurrentLayout(reader)

    expect(restored?.navigation).toBe(await getLastNavigationMade(reader))
    expect(restored?.holdsOnCurrentLayout).toBe(true)
  })

  it("is reported once for every navigation, and again only when a layout voids it", async () => {
    const reader = createTestReader()

    /**
     * Pagination resolves a result for every navigation reported, and only
     * withdraws for one reported again. So no navigation may go unreported,
     * and one reported again must not hold.
     */
    const navigationsMade: Navigation[] = []
    const reports: NavigationAgainstCurrentLayout[] = []
    reader.navigation.navigation$.subscribe((navigation) => {
      navigationsMade.push(navigation)
    })
    reader.navigation.navigationAgainstCurrentLayout$.subscribe(
      (navigationAgainstCurrentLayout) => {
        reports.push(navigationAgainstCurrentLayout)
      },
    )

    mountTestReader(reader)
    await settledOn(reader, 0)

    // A navigation made while a layout is pending, then restored onto it.
    reader.layout()
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    const isReportedAgain = (
      { navigation }: NavigationAgainstCurrentLayout,
      index: number,
    ) => navigation === reports[index - 1]?.navigation
    const reportedAgain = reports.filter(isReportedAgain)

    expect(
      reports
        .filter((report, index) => !isReportedAgain(report, index))
        .map(({ navigation }) => navigationsMade.indexOf(navigation)),
    ).toEqual(navigationsMade.map((_, index) => index))
    expect(reportedAgain.length).toBeGreaterThan(0)
    expect(
      reportedAgain.filter(({ holdsOnCurrentLayout }) => holdsOnCurrentLayout),
    ).toEqual([])
  })

  it("voids the navigation being reported, not the one before, when a subscriber requests a layout", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const paginatedItems: (number | undefined)[] = []
    reader.pagination.state$.subscribe(({ begin }) => {
      paginatedItems.push(begin.spineItemIndex)
    })
    // As an app does when reaching an item makes it change a layout setting.
    reader.pagination.state$
      .pipe(first(({ begin }) => begin.spineItemIndex === 1))
      .subscribe(() => reader.layout())

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    const navigation = await getLastNavigationMade(reader)
    const reported = getNavigationAgainstCurrentLayout(reader)

    expect(reported?.navigation).toBe(navigation)
    expect(reported?.holdsOnCurrentLayout).toBe(false)

    await settledOn(reader, 1)

    expect(paginatedItems.slice(paginatedItems.indexOf(1))).not.toContain(0)
  })

  it("completes when the reader is destroyed", () => {
    const reader = createTestReader()
    const onComplete = vi.fn()

    reader.navigation.navigationAgainstCurrentLayout$.subscribe({
      complete: onComplete,
    })
    reader.destroy()

    expect(onComplete).toHaveBeenCalled()
  })
})
