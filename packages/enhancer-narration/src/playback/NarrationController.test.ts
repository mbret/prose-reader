// @vitest-environment jsdom
import { config, of } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createControlledSource,
  installNarrationReaderTestEnvironment,
  mountNarrationReader,
  recordNarrationStates,
} from "../tests/narrationReader.ts"
import type { NarrationSource, NarrationState } from "../types.ts"

installNarrationReaderTestEnvironment()

/** The errors the enhancer recovered from and reported to the app. */
const reportedErrors: unknown[] = []

beforeEach(() => {
  config.onUnhandledError = (error) => {
    reportedErrors.push(error)
  }
})

afterEach(() => {
  config.onUnhandledError = null
  reportedErrors.length = 0
})

const getLatest = <Entry>(entries: Entry[]) => {
  const latestEntry = entries.at(-1)

  if (!latestEntry) throw new Error("nothing was asked of the source yet")

  return latestEntry
}

/** More spine items than the stack has room for calls nested in each other. */
const numberOfSpineItemsOfLongBook = 3000

const getSpineItemIndexes = (narrationRequests: { spineItemIndex: number }[]) =>
  narrationRequests.map(({ spineItemIndex }) => spineItemIndex)

/** A reader whose narration plays the first unit of the first spine item. */
const mountReaderPlayingFirstUnit = async () => {
  const controlledSource = createControlledSource()
  const reader = await mountNarrationReader([controlledSource.source])

  reader.narration.play()
  getLatest(controlledSource.narrationRequests).answerWithUnits([
    "cfi-0-0",
    "cfi-0-1",
    "cfi-0-2",
  ])
  getLatest(controlledSource.playbacks).reportUnitHeard(0)

  return { reader, ...controlledSource }
}

describe("narration playback", () => {
  it("loads until its source reports a unit heard, then plays that unit", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])
    const states = recordNarrationStates(reader)

    reader.narration.play()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([0])

    getLatest(narrationRequests).answerWithUnits(["cfi-0-0", "cfi-0-1"])

    expect(playbacks.map(({ startUnitIndex }) => startUnitIndex)).toEqual([0])

    getLatest(playbacks).reportUnitHeard(0)
    getLatest(playbacks).reportUnitHeard(1)

    expect(states).toEqual([
      { status: "idle", activeUnit: undefined },
      // The units of the spine item are not known yet.
      { status: "loading", activeUnit: undefined },
      // They are, and the first one is not heard yet.
      {
        status: "loading",
        activeUnit: { cfi: "cfi-0-0", spineItemIndex: 0, unitIndex: 0 },
      },
      {
        status: "playing",
        activeUnit: { cfi: "cfi-0-0", spineItemIndex: 0, unitIndex: 0 },
      },
      {
        status: "playing",
        activeUnit: { cfi: "cfi-0-1", spineItemIndex: 0, unitIndex: 1 },
      },
    ])
  })

  it("starts with the first visible spine item", async () => {
    const { source, narrationRequests } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.navigation.goToSpineItem({ indexOrId: 1 })
    await vi.runAllTimersAsync()
    expect(reader.pagination.state.begin.spineItemIndex).toBe(1)

    reader.narration.play()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([1])
  })

  it("goes on with the next spine item once its source completed", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()

    getLatest(playbacks).complete()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 1])
    // Between two spine items no unit is heard, and the next ones are not known.
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: undefined,
    })

    getLatest(narrationRequests).answerWithUnits(["cfi-1-0"])
    getLatest(playbacks).reportUnitHeard(0)

    expect(reader.narration.state).toEqual({
      status: "playing",
      activeUnit: { cfi: "cfi-1-0", spineItemIndex: 1, unitIndex: 0 },
    })
  })

  it.each([
    { nothingForTheSpineItem: undefined, title: "no narration" },
    { nothingForTheSpineItem: [], title: "no unit" },
  ])(
    "skips a spine item its source has $title for",
    async ({ nothingForTheSpineItem }) => {
      const { source, narrationRequests, playbacks } = createControlledSource()
      const reader = await mountNarrationReader([source])

      reader.narration.play()
      getLatest(narrationRequests).answerWithUnits(nothingForTheSpineItem)

      expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 1])
      expect(playbacks).toHaveLength(0)
      expect(reader.narration.state.status).toBe("loading")
    },
  )

  it("returns to idle after the last spine item", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.navigation.goToSpineItem({ indexOrId: 2 })
    await vi.runAllTimersAsync()
    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits(["cfi-2-0"])
    getLatest(playbacks).reportUnitHeard(0)
    getLatest(playbacks).complete()

    expect(reader.narration.state).toEqual({
      status: "idle",
      activeUnit: undefined,
    })
    expect(getSpineItemIndexes(narrationRequests)).toEqual([2])
  })

  it("ignores a report for a unit the narration does not have", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()
    const states = recordNarrationStates(reader)

    getLatest(playbacks).reportUnitHeard(3)
    getLatest(playbacks).reportUnitHeard(-1)

    expect(states).toHaveLength(1)
    expect(reader.narration.state.activeUnit?.unitIndex).toBe(0)
  })

  it.each([
    {
      title: "a source that answers at once with nothing",
      sources: [{ getNarrationOfSpineItem: () => of(undefined) }],
    },
    { title: "no source", sources: [] },
  ] satisfies {
    title: string
    sources: NarrationSource[]
  }[])(
    "goes through a book with $title, and ends idle",
    async ({ sources }) => {
      const reader = await mountNarrationReader(sources)
      const states = recordNarrationStates(reader)

      reader.narration.play()

      expect(states).toEqual([
        { status: "idle", activeUnit: undefined },
        { status: "loading", activeUnit: undefined },
        { status: "idle", activeUnit: undefined },
      ])
    },
  )

  it("goes through the rest of a long book that has nothing more to narrate, once a spine item was heard", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const sourceOfFirstSpineItemOnly: NarrationSource = {
      getNarrationOfSpineItem: (params) =>
        params.spineItem.index === 0
          ? source.getNarrationOfSpineItem(params)
          : of(undefined),
    }
    const reader = await mountNarrationReader([sourceOfFirstSpineItemOnly], {
      numberOfSpineItems: numberOfSpineItemsOfLongBook,
    })

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0"])
    getLatest(playbacks).reportUnitHeard(0)
    // Every following spine item ends as soon as it starts. Were each one
    // started from inside the end of the previous one, the stack would
    // overflow before the last, and the narration would stay `loading`.
    getLatest(playbacks).complete()

    expect(reader.narration.state).toEqual({
      status: "idle",
      activeUnit: undefined,
    })
  })
})

describe("narration sources", () => {
  it("asks the second source only when the first has nothing for the spine item", async () => {
    const first = createControlledSource()
    const second = createControlledSource()
    const reader = await mountNarrationReader([first.source, second.source])

    reader.narration.play()

    expect(first.narrationRequests).toHaveLength(1)
    expect(second.narrationRequests).toHaveLength(0)

    getLatest(first.narrationRequests).answerWithUnits(undefined)

    expect(getSpineItemIndexes(second.narrationRequests)).toEqual([0])

    getLatest(second.narrationRequests).answerWithUnits(["second-0-0"])
    getLatest(second.playbacks).complete()

    // Each spine item is offered to the first source again.
    expect(getSpineItemIndexes(first.narrationRequests)).toEqual([0, 1])

    getLatest(first.narrationRequests).answerWithUnits(["first-1-0"])
    getLatest(first.playbacks).reportUnitHeard(0)

    expect(reader.narration.state.activeUnit?.cfi).toBe("first-1-0")
    expect(second.narrationRequests).toHaveLength(1)
  })

  it("asks the next source when one fails to answer, and reports the error", async () => {
    const first = createControlledSource()
    const second = createControlledSource()
    const reader = await mountNarrationReader([first.source, second.source])
    const error = new Error("the source cannot read the spine item")

    reader.narration.play()
    getLatest(first.narrationRequests).fail(error)

    expect(second.narrationRequests).toHaveLength(1)

    getLatest(second.narrationRequests).answerWithUnits(["second-0-0"])
    getLatest(second.playbacks).reportUnitHeard(0)

    expect(reader.narration.state).toEqual({
      status: "playing",
      activeUnit: { cfi: "second-0-0", spineItemIndex: 0, unitIndex: 0 },
    })

    vi.runAllTimers()
    expect(reportedErrors).toEqual([error])
  })

  it("pauses on the spine item when a source failed and no other has units for it", async () => {
    const first = createControlledSource()
    const second = createControlledSource()
    const reader = await mountNarrationReader([first.source, second.source])

    reader.narration.play()
    getLatest(first.narrationRequests).fail(new Error("the source is offline"))
    getLatest(second.narrationRequests).answerWithUnits(undefined)

    // The spine item is not skipped: the source that failed may narrate it.
    expect(getSpineItemIndexes(first.narrationRequests)).toEqual([0])
    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: undefined,
      hasError: true,
    })

    reader.narration.play()

    expect(getSpineItemIndexes(first.narrationRequests)).toEqual([0, 0])
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: undefined,
    })
  })
})

describe("narration commands", () => {
  it("pause stops the sound and keeps the unit, and play resumes from that unit", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()

    getLatest(playbacks).reportUnitHeard(1)
    const pausedPlayback = getLatest(playbacks)

    reader.narration.pause()

    expect(pausedPlayback.isSubscribed).toBe(false)
    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: "cfi-0-1", spineItemIndex: 0, unitIndex: 1 },
      hasError: false,
    })

    reader.narration.play()

    // The narration of the spine item is kept: its source is not asked again.
    expect(narrationRequests).toHaveLength(1)
    expect(playbacks.map(({ startUnitIndex }) => startUnitIndex)).toEqual([
      0, 1,
    ])
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: { cfi: "cfi-0-1", spineItemIndex: 0, unitIndex: 1 },
    })

    getLatest(playbacks).reportUnitHeard(1)

    expect(reader.narration.state.status).toBe("playing")
  })

  it("a pause before the first unit is heard keeps the units its source gave", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0", "cfi-0-1"])
    reader.narration.pause()

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: "cfi-0-0", spineItemIndex: 0, unitIndex: 0 },
      hasError: false,
    })

    reader.narration.play()

    expect(narrationRequests).toHaveLength(1)
    expect(playbacks.map(({ startUnitIndex }) => startUnitIndex)).toEqual([
      0, 0,
    ])
  })

  it("a pause before the units are known keeps the spine item, and a late answer changes nothing", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.navigation.goToSpineItem({ indexOrId: 1 })
    await vi.runAllTimersAsync()
    reader.narration.play()
    const replacedRequest = getLatest(narrationRequests)

    reader.narration.pause()
    const states = recordNarrationStates(reader)

    expect(replacedRequest.isSubscribed).toBe(false)

    replacedRequest.answerWithUnits(["cfi-1-0"])

    expect(playbacks).toHaveLength(0)
    expect(states).toEqual([
      { status: "paused", activeUnit: undefined, hasError: false },
    ])

    // The reader shows another spine item: the narration resumes at its own.
    reader.navigation.goToSpineItem({ indexOrId: 0 })
    await vi.runAllTimersAsync()
    reader.narration.play()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([1, 1])
  })

  it("pause changes nothing while idle", async () => {
    const { source } = createControlledSource()
    const reader = await mountNarrationReader([source])
    const states = recordNarrationStates(reader)

    reader.narration.pause()

    expect(states).toEqual([{ status: "idle", activeUnit: undefined }])
  })

  it("stop stops the sound and forgets the unit", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()
    const stoppedPlayback = getLatest(playbacks)

    reader.narration.stop()

    expect(stoppedPlayback.isSubscribed).toBe(false)
    expect(reader.narration.state).toEqual({
      status: "idle",
      activeUnit: undefined,
    })

    reader.narration.play()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 0])
  })

  it.each([
    { title: "playing", reachState: () => {} },
    {
      title: "loading the next spine item",
      reachState: (
        playbacks: ReturnType<typeof createControlledSource>["playbacks"],
      ) => getLatest(playbacks).complete(),
    },
  ])("play changes nothing while $title", async ({ reachState }) => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()

    reachState(playbacks)
    const numberOfNarrationRequests = narrationRequests.length
    const numberOfPlaybacks = playbacks.length
    const states = recordNarrationStates(reader)

    reader.narration.play()

    expect(narrationRequests).toHaveLength(numberOfNarrationRequests)
    expect(playbacks).toHaveLength(numberOfPlaybacks)
    expect(
      getLatest(narrationRequests).isSubscribed ||
        getLatest(playbacks).isSubscribed,
    ).toBe(true)
    expect(states).toHaveLength(1)
  })

  it("destroying the reader stops the sound", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()

    reader.destroy()

    expect(getLatest(playbacks).isSubscribed).toBe(false)
  })
})

describe("narration errors", () => {
  it("an error of the source pauses on the latest unit heard, with the error reported", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()
    const error = new Error("the voice failed")

    getLatest(playbacks).reportUnitHeard(2)
    getLatest(playbacks).fail(error)

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: "cfi-0-2", spineItemIndex: 0, unitIndex: 2 },
      hasError: true,
    })

    vi.runAllTimers()
    expect(reportedErrors).toEqual([error])

    reader.narration.play()

    expect(getLatest(playbacks).startUnitIndex).toBe(2)
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: { cfi: "cfi-0-2", spineItemIndex: 0, unitIndex: 2 },
    })
  })

  it("an error before any unit is heard pauses on the unit that was about to be", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0", "cfi-0-1"])
    getLatest(playbacks).fail(new Error("the voice failed"))

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: "cfi-0-0", spineItemIndex: 0, unitIndex: 0 },
      hasError: true,
    })
  })

  it("stop forgets the error with the place", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()

    getLatest(playbacks).fail(new Error("the voice failed"))
    reader.narration.stop()

    expect(reader.narration.state).toEqual({
      status: "idle",
      activeUnit: undefined,
    })
  })

  it("a second pause keeps the error", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()

    getLatest(playbacks).fail(new Error("the voice failed"))
    reader.narration.pause()

    expect(reader.narration.state).toMatchObject({
      status: "paused",
      hasError: true,
    })
  })
})

describe("narration states", () => {
  it("never reports a unit as playing before its source said it is heard", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])
    /** The units heard since the latest `play()`. */
    let unitsHeard: string[] = []
    const unitsReportedPlaying: string[] = []
    const unitsReportedPlayingBeforeHeard: string[] = []

    reader.narration.state$.subscribe(({ status, activeUnit }) => {
      if (status !== "playing") return

      unitsReportedPlaying.push(activeUnit.cfi)

      if (!unitsHeard.includes(activeUnit.cfi)) {
        unitsReportedPlayingBeforeHeard.push(activeUnit.cfi)
      }
    })

    const play = () => {
      unitsHeard = []
      reader.narration.play()
    }
    const hearUnit = (spineItemIndex: number, unitIndex: number) => {
      unitsHeard.push(`cfi-${spineItemIndex}-${unitIndex}`)
      getLatest(playbacks).reportUnitHeard(unitIndex)
    }

    play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0", "cfi-0-1"])
    hearUnit(0, 0)
    reader.narration.pause()
    play()
    hearUnit(0, 0)
    hearUnit(0, 1)
    getLatest(playbacks).complete()
    getLatest(narrationRequests).answerWithUnits(["cfi-1-0"])
    reader.narration.stop()
    play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0", "cfi-0-1"])
    hearUnit(0, 0)

    expect(unitsReportedPlayingBeforeHeard).toEqual([])
    expect(unitsReportedPlaying).toEqual([
      "cfi-0-0",
      "cfi-0-0",
      "cfi-0-1",
      "cfi-0-0",
    ])
  })

  it("gives every subscriber the states in the order they were made, when one of them sends a command", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])
    const statesOfFirstSubscriber: NarrationState["status"][] = []
    const statesOfSecondSubscriber: NarrationState["status"][] = []

    reader.narration.state$.subscribe(({ status }) => {
      statesOfFirstSubscriber.push(status)

      // The second subscriber has not received `playing` yet.
      if (status === "playing") reader.narration.pause()
    })
    reader.narration.state$.subscribe(({ status }) => {
      statesOfSecondSubscriber.push(status)
    })

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0"])
    getLatest(playbacks).reportUnitHeard(0)

    expect(statesOfFirstSubscriber).toEqual([
      "idle",
      "loading",
      "loading",
      "playing",
      "paused",
    ])
    expect(statesOfSecondSubscriber).toEqual(statesOfFirstSubscriber)
    expect(reader.narration.state.status).toBe("paused")
  })

  it("plays again when a subscriber pauses then plays while it receives a state", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])
    let hasRestarted = false

    reader.narration.state$.subscribe(({ status }) => {
      if (status !== "playing" || hasRestarted) return

      hasRestarted = true
      reader.narration.pause()
      // The pause is not applied yet. The play must not be dropped as one
      // sent while the narration plays.
      reader.narration.play()
    })

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits(["cfi-0-0"])
    getLatest(playbacks).reportUnitHeard(0)

    expect(playbacks.map(({ isSubscribed }) => isSubscribed)).toEqual([
      false,
      true,
    ])
    expect(reader.narration.state.status).toBe("loading")
  })
})
