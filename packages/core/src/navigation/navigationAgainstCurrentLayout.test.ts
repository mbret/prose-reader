// @vitest-environment jsdom
import { filter, first, firstValueFrom, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  requestLayoutByUnloadingItem,
  setTestViewport,
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

/**
 * Every report from now on, the replayed one aside, as whether each repeats
 * the navigation made before and holds.
 */
const recordReportsAfter = (reader: TestReader, before: Navigation) => {
  const reports: [navigation: "before" | Navigation, holds: boolean][] = []

  reader.navigation.navigationAgainstCurrentLayout$
    .pipe(skip(1))
    .subscribe(({ navigation, holdsOnCurrentLayout }) => {
      reports.push([
        navigation === before ? "before" : navigation,
        holdsOnCurrentLayout,
      ])
    })

  return reports
}

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
     * The request replaces the layout the navigation was made over: it voids
     * the navigation, which is reported again. The pages landing make current
     * a layout it was not restored onto, and leave it void, reported once.
     * Only the restoration that follows holds.
     */
    expect(restored.triggeredBy).toBe("restoration")
    expect(
      reports
        .slice(0, 2)
        .map(({ navigation, holdsOnCurrentLayout }) => [
          navigation === before ? "before" : navigation === restored,
          holdsOnCurrentLayout,
        ]),
    ).toEqual([
      ["before", false],
      [true, true],
    ])
  })

  it("keeps holding through the layout of an item after the ones it shows, as does a navigation made meanwhile", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const before = await getLastNavigationMade(reader)
    const reports = recordReportsAfter(reader, before)

    /**
     * The second item is laid out again, and the spine with it from there:
     * the first item, the one shown, keeps its place and its pages.
     */
    await requestLayoutByUnloadingItem(reader, 1)

    expect(getNavigationAgainstCurrentLayout(reader)).toEqual({
      navigation: before,
      holdsOnCurrentLayout: true,
    })
    expect(reports).toEqual([])

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })

    const madeMeanwhile = await getLastNavigationMade(reader)

    expect(madeMeanwhile).not.toBe(before)
    expect(reader.spine.firstItemIndexAwaitingLayout).toBe(1)
    expect(getNavigationAgainstCurrentLayout(reader)).toEqual({
      navigation: madeMeanwhile,
      holdsOnCurrentLayout: true,
    })

    // The navigator restores the navigation once the new pages are published.
    await firstValueFrom(
      reader.navigation.navigation$.pipe(
        filter(({ triggeredBy }) => triggeredBy === "restoration"),
      ),
    )

    /**
     * The pages being published describe the item shown as they did: they
     * void nothing, and neither did anything since the layout was requested.
     */
    expect(reports.filter(([, holds]) => !holds)).toEqual([])
  })

  it("stops holding when the layout of an item it shows, or of one before, is requested", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    const shown = await getLastNavigationMade(reader)
    const reports = recordReportsAfter(reader, shown)

    // The first item, before the one shown, moves it if its size changes.
    await requestLayoutByUnloadingItem(reader, 0)

    expect(reports).toEqual([["before", false]])

    await settledOn(reader, 1)

    const restored = await getLastNavigationMade(reader)
    const reportsOfTheShownItem = recordReportsAfter(reader, restored)

    // The shown item itself.
    await requestLayoutByUnloadingItem(reader, 1)

    expect(reportsOfTheShownItem).toEqual([["before", false]])
  })

  it("stops holding when the layout of the last item it shows is requested, on a spread", async () => {
    // Landscape: the two items share a spread.
    setTestViewport({ width: 200, height: 100 })

    const reader = createTestReader()

    mountTestReader(reader)

    const settled = await settledOn(reader, 0)

    expect(settled.end.spineItemIndex).toBe(1)

    const shown = await getLastNavigationMade(reader)
    const reports = recordReportsAfter(reader, shown)

    // The spread's second page, whose item the first page does not move.
    await requestLayoutByUnloadingItem(reader, 1)

    expect(reports).toEqual([["before", false]])
  })

  it("does not hold when made while a layout of the reader is pending", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * A layout is pending from the moment it is requested, and one of the
     * reader can change every item, the ones shown included.
     */
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
