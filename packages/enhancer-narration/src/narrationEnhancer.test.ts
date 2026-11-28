// @vitest-environment jsdom
import { concat, config, NEVER, Observable, of } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cfiOfUnit,
  createControlledSource,
  installNarrationReaderTestEnvironment,
  mountNarrationReader,
  recordNarrationStates,
} from "./tests/narrationReader.ts"
import type {
  NarrationProgress,
  NarrationSource,
  NarrationState,
} from "./types.ts"

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
    cfiOfUnit(0, 0),
    cfiOfUnit(0, 1),
    cfiOfUnit(0, 2),
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

    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])

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
        activeUnit: { cfi: cfiOfUnit(0, 0), spineItemIndex: 0, unitIndex: 0 },
      },
      {
        status: "playing",
        activeUnit: { cfi: cfiOfUnit(0, 0), spineItemIndex: 0, unitIndex: 0 },
      },
      {
        status: "playing",
        activeUnit: { cfi: cfiOfUnit(0, 1), spineItemIndex: 0, unitIndex: 1 },
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

    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(1, 0)])
    getLatest(playbacks).reportUnitHeard(0)

    expect(reader.narration.state).toEqual({
      status: "playing",
      activeUnit: { cfi: cfiOfUnit(1, 0), spineItemIndex: 1, unitIndex: 0 },
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
    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(2, 0)])
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
    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(0, 0)])
    getLatest(playbacks).reportUnitHeard(0)
    // Every following spine item ends as soon as it starts.
    getLatest(playbacks).complete()

    expect(reader.narration.state).toEqual({
      status: "idle",
      activeUnit: undefined,
    })
  })
})

describe("narration start", () => {
  /** A cfi in the text of a spine item, at a character of its units. */
  const cfiOfCharacter = (spineItemIndex: number, characterOffset: number) =>
    `epubcfi(/6/${(spineItemIndex + 1) * 2}[${spineItemIndex}]!/4/2/1:${characterOffset})`

  /**
   * jsdom lays nothing out, so the pagination of the reader never names a
   * character. This gives it the first visible character a browser would.
   */
  const showPageStartingAt = (
    reader: Awaited<ReturnType<typeof mountNarrationReader>>,
    { cfi, isSettled }: { cfi: string; isSettled: boolean },
  ) => {
    const pagination = reader.pagination.state

    vi.spyOn(reader.pagination, "state", "get").mockReturnValue({
      ...pagination,
      isSettled,
      begin: { ...pagination.begin, cfi },
      end: { ...pagination.end, cfi },
    })
  }

  it("a first start begins with the first unit that starts on the visible page", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    // The page starts in the middle of the second unit.
    showPageStartingAt(reader, { cfi: cfiOfCharacter(0, 25), isSettled: true })
    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
      cfiOfUnit(0, 2),
    ])

    expect(getLatest(playbacks).startUnitIndex).toBe(2)
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: { cfi: cfiOfUnit(0, 2), spineItemIndex: 0, unitIndex: 2 },
    })
  })

  it("a first start goes to the next spine item when no unit starts on the visible page or after it", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    // The last page of the spine item shows the end of its last unit.
    showPageStartingAt(reader, { cfi: cfiOfCharacter(0, 25), isSettled: true })
    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])

    expect(playbacks).toHaveLength(0)
    expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 1])

    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(1, 0)])

    expect(getLatest(playbacks).startUnitIndex).toBe(0)
  })

  it("a first start begins with the first unit while the pagination is not settled", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    // The cfi is still the one of the page shown before.
    showPageStartingAt(reader, { cfi: cfiOfCharacter(0, 25), isSettled: false })
    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
      cfiOfUnit(0, 2),
    ])

    expect(getLatest(playbacks).startUnitIndex).toBe(0)
  })

  it("a resume begins with the active unit, not with the visible page", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()

    reader.narration.pause()
    showPageStartingAt(reader, { cfi: cfiOfCharacter(0, 25), isSettled: true })
    reader.narration.play()

    expect(getLatest(playbacks).startUnitIndex).toBe(0)
  })

  it("plays from the unit that holds a cfi, in the spine item of that cfi", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.narration.playFromCfi(cfiOfCharacter(1, 25))

    expect(getSpineItemIndexes(narrationRequests)).toEqual([1])

    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(1, 0),
      cfiOfUnit(1, 1),
      cfiOfUnit(1, 2),
    ])

    // Character 25 is in the second unit, which starts at character 20.
    expect(getLatest(playbacks).startUnitIndex).toBe(1)
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: { cfi: cfiOfUnit(1, 1), spineItemIndex: 1, unitIndex: 1 },
    })
  })

  it("plays from a cfi of the spine item it is on without asking its source again", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()
    const replacedPlayback = getLatest(playbacks)

    reader.narration.playFromCfi(cfiOfCharacter(0, 45))

    expect(replacedPlayback.isSubscribed).toBe(false)
    expect(narrationRequests).toHaveLength(1)
    expect(playbacks.map(({ startUnitIndex }) => startUnitIndex)).toEqual([
      0, 2,
    ])
  })

  it("plays from a cfi of another spine item while it plays", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()
    const replacedPlayback = getLatest(playbacks)

    reader.narration.playFromCfi(cfiOfCharacter(2, 0))

    expect(replacedPlayback.isSubscribed).toBe(false)
    expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 2])
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: undefined,
    })
  })

  it.each([
    {
      title: "a spine item the book does not have",
      cfi: "epubcfi(/6/40!/4/2/1:0)",
    },
    { title: "a text that is not a cfi", cfi: "not a cfi" },
  ])("keeps playing when asked to play from $title", async ({ cfi }) => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()
    const states = recordNarrationStates(reader)

    reader.narration.playFromCfi(cfi)

    expect(getLatest(playbacks).isSubscribed).toBe(true)
    expect(narrationRequests).toHaveLength(1)
    expect(states).toHaveLength(1)
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

    getLatest(second.narrationRequests).answerWithUnits([cfiOfUnit(0, 5)])
    getLatest(second.playbacks).complete()

    // Each spine item is offered to the first source again.
    expect(getSpineItemIndexes(first.narrationRequests)).toEqual([0, 1])

    getLatest(first.narrationRequests).answerWithUnits([cfiOfUnit(1, 3)])
    getLatest(first.playbacks).reportUnitHeard(0)

    expect(reader.narration.state.activeUnit?.cfi).toBe(cfiOfUnit(1, 3))
    expect(second.narrationRequests).toHaveLength(1)
  })

  it("asks the second source when the first gives a narration with no unit", async () => {
    const first = createControlledSource()
    const second = createControlledSource()
    const reader = await mountNarrationReader([first.source, second.source])

    reader.narration.play()
    getLatest(first.narrationRequests).answerWithUnits([])

    expect(getSpineItemIndexes(second.narrationRequests)).toEqual([0])
  })

  it("pauses on the spine item when a source fails to answer, without asking the next source", async () => {
    const first = createControlledSource()
    const second = createControlledSource()
    const reader = await mountNarrationReader([first.source, second.source])
    const error = new Error("the source is offline")

    reader.narration.play()
    getLatest(first.narrationRequests).fail(error)

    // The spine item is not skipped, and not given to another source: the
    // source that failed may be the one that narrates it.
    expect(second.narrationRequests).toHaveLength(0)
    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: undefined,
      hasError: true,
    })

    vi.runAllTimers()
    expect(reportedErrors).toEqual([error])

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
      activeUnit: { cfi: cfiOfUnit(0, 1), spineItemIndex: 0, unitIndex: 1 },
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
      activeUnit: { cfi: cfiOfUnit(0, 1), spineItemIndex: 0, unitIndex: 1 },
    })

    getLatest(playbacks).reportUnitHeard(1)

    expect(reader.narration.state.status).toBe("playing")
  })

  it("a pause before the first unit is heard keeps the units its source gave", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])
    reader.narration.pause()

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: cfiOfUnit(0, 0), spineItemIndex: 0, unitIndex: 0 },
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

    replacedRequest.answerWithUnits([cfiOfUnit(1, 0)])

    expect(playbacks).toHaveLength(0)
    expect(states).toEqual([
      { status: "paused", activeUnit: undefined, hasError: false },
    ])

    // The reader shows spine item 0, and the narration resumes at spine item
    // 1, where it paused.
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

  it("stop stops the sound and forgets the place: the next play is a first start", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()

    // The narration is on the second unit of spine item 1, and the reader
    // shows spine item 0.
    getLatest(playbacks).complete()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(1, 0),
      cfiOfUnit(1, 1),
    ])
    getLatest(playbacks).reportUnitHeard(1)
    expect(reader.narration.state.activeUnit).toEqual({
      cfi: cfiOfUnit(1, 1),
      spineItemIndex: 1,
      unitIndex: 1,
    })
    expect(reader.pagination.state.begin.spineItemIndex).toBe(0)
    const stoppedPlayback = getLatest(playbacks)

    reader.narration.stop()

    expect(stoppedPlayback.isSubscribed).toBe(false)
    expect(reader.narration.state).toEqual({
      status: "idle",
      activeUnit: undefined,
    })

    reader.narration.play()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 1, 0])

    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])

    expect(getLatest(playbacks).startUnitIndex).toBe(0)
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

  it("destroying the reader stops the sound and completes the state", async () => {
    const { reader, playbacks } = await mountReaderPlayingFirstUnit()
    let isStateComplete = false

    reader.narration.state$.subscribe({
      complete: () => {
        isStateComplete = true
      },
    })
    reader.destroy()

    expect(getLatest(playbacks).isSubscribed).toBe(false)
    expect(isStateComplete).toBe(true)
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
      activeUnit: { cfi: cfiOfUnit(0, 2), spineItemIndex: 0, unitIndex: 2 },
      hasError: true,
    })

    vi.runAllTimers()
    expect(reportedErrors).toEqual([error])

    reader.narration.play()

    expect(getLatest(playbacks).startUnitIndex).toBe(2)
    expect(reader.narration.state).toEqual({
      status: "loading",
      activeUnit: { cfi: cfiOfUnit(0, 2), spineItemIndex: 0, unitIndex: 2 },
    })
  })

  it("an error before any unit is heard pauses on the unit that was about to be", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])
    getLatest(playbacks).fail(new Error("the voice failed"))

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: cfiOfUnit(0, 0), spineItemIndex: 0, unitIndex: 0 },
      hasError: true,
    })
  })

  it("a report that is not a progress pauses with an error, and the narration still answers", async () => {
    const reader = await mountNarrationReader([
      {
        getNarrationOfSpineItem: () =>
          of({
            units: [{ cfi: cfiOfUnit(0, 0) }],
            // What a source written in plain JavaScript could emit.
            play: () => of(undefined as unknown as NarrationProgress),
          }),
      },
    ])

    reader.narration.play()

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: cfiOfUnit(0, 0), spineItemIndex: 0, unitIndex: 0 },
      hasError: true,
    })

    reader.narration.stop()

    expect(reader.narration.state.status).toBe("idle")
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

describe("narration sources that misbehave", () => {
  it("pauses on the unit that was about to be heard when play throws as it is called", async () => {
    const error = new Error("the source cannot play")
    const reader = await mountNarrationReader([
      {
        getNarrationOfSpineItem: () =>
          of({
            units: [{ cfi: "cfi-0-0" }],
            play: () => {
              throw error
            },
          }),
      },
    ])

    reader.narration.play()

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: "cfi-0-0", spineItemIndex: 0, unitIndex: 0 },
      hasError: true,
    })

    vi.runAllTimers()
    expect(reportedErrors).toEqual([error])
  })

  it("pauses at the spine item its source fails for, after the first one, and play asks for that spine item again", async () => {
    const { reader, narrationRequests, playbacks } =
      await mountReaderPlayingFirstUnit()

    getLatest(playbacks).complete()
    getLatest(narrationRequests).fail(new Error("the source is offline"))

    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: undefined,
      hasError: true,
    })

    reader.narration.play()

    expect(getSpineItemIndexes(narrationRequests)).toEqual([0, 1, 1])
  })

  it("takes the first answer of a source that never completes", async () => {
    const reader = await mountNarrationReader([
      { getNarrationOfSpineItem: () => concat(of(undefined), NEVER) },
    ])

    reader.narration.play()

    // The three spine items were asked for, one after the other.
    expect(reader.narration.state.status).toBe("idle")
  })

  /** A source whose sound cannot be stopped without an error. */
  const createSourceThatThrowsWhenStopped = (
    error: Error,
  ): NarrationSource => ({
    getNarrationOfSpineItem: () =>
      of({
        units: [{ cfi: "cfi-0-0" }],
        play: () =>
          new Observable<NarrationProgress>((subscriber) => {
            subscriber.next({ unitIndex: 0 })

            return () => {
              throw error
            }
          }),
      }),
  })

  it("pauses, and goes on answering, when its source throws as its sound is stopped", async () => {
    const error = new Error("the sound cannot be stopped")
    const reader = await mountNarrationReader([
      createSourceThatThrowsWhenStopped(error),
    ])

    reader.narration.play()
    expect(reader.narration.state.status).toBe("playing")

    reader.narration.pause()

    expect(reader.narration.state.status).toBe("paused")

    vi.runAllTimers()
    expect(reportedErrors).toEqual([error])

    reader.narration.play()

    expect(reader.narration.state.status).toBe("playing")
  })

  it("destroys the reader when its source throws as its sound is stopped", async () => {
    const reader = await mountNarrationReader([
      createSourceThatThrowsWhenStopped(
        new Error("the sound cannot be stopped"),
      ),
    ])
    let isReaderDestroyed = false

    reader.$.destroy$.subscribe(() => {
      isReaderDestroyed = true
    })
    reader.narration.play()
    reader.destroy()

    expect(isReaderDestroyed).toBe(true)
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
      unitsHeard.push(cfiOfUnit(spineItemIndex, unitIndex))
      getLatest(playbacks).reportUnitHeard(unitIndex)
    }

    play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])
    hearUnit(0, 0)
    reader.narration.pause()
    play()
    hearUnit(0, 0)
    hearUnit(0, 1)
    getLatest(playbacks).complete()
    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(1, 0)])
    reader.narration.stop()
    play()
    getLatest(narrationRequests).answerWithUnits([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
    ])
    hearUnit(0, 0)

    expect(unitsReportedPlayingBeforeHeard).toEqual([])
    expect(unitsReportedPlaying).toEqual([
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 0),
      cfiOfUnit(0, 1),
      cfiOfUnit(0, 0),
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
    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(0, 0)])
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

  it("applies at once a play then a pause that a subscriber sends while it receives a state", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])
    let hasRetried = false

    reader.narration.state$.subscribe((state) => {
      if (hasRetried || state.status !== "paused" || !state.hasError) return

      hasRetried = true
      reader.narration.play()
      // Were the play still waiting, the pause would find the narration
      // paused on its error and change nothing, and the play would be lost.
      reader.narration.pause()
    })

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(0, 0)])
    getLatest(playbacks).reportUnitHeard(0)
    getLatest(playbacks).fail(new Error("the voice failed"))

    expect(hasRetried).toBe(true)
    expect(playbacks.map(({ startUnitIndex }) => startUnitIndex)).toEqual([
      0, 0,
    ])
    expect(reader.narration.state).toEqual({
      status: "paused",
      activeUnit: { cfi: cfiOfUnit(0, 0), spineItemIndex: 0, unitIndex: 0 },
      hasError: false,
    })
  })

  it("plays again when a subscriber pauses then plays while it receives a state", async () => {
    const { source, narrationRequests, playbacks } = createControlledSource()
    const reader = await mountNarrationReader([source])
    let hasRestarted = false

    reader.narration.state$.subscribe(({ status }) => {
      if (status !== "playing" || hasRestarted) return

      hasRestarted = true
      reader.narration.pause()
      // The state still reads `playing`, but the pause applied: this play
      // must not be dropped as one sent while the narration plays.
      reader.narration.play()
    })

    reader.narration.play()
    getLatest(narrationRequests).answerWithUnits([cfiOfUnit(0, 0)])
    getLatest(playbacks).reportUnitHeard(0)

    expect(playbacks.map(({ isSubscribed }) => isSubscribed)).toEqual([
      false,
      true,
    ])
    expect(reader.narration.state.status).toBe("loading")
  })
})
