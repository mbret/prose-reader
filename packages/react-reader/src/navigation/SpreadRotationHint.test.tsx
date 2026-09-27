/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { useReaderMock } = vi.hoisted(() => ({ useReaderMock: vi.fn() }))

vi.mock("../context/useReader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context/useReader")>()),
  useReader: useReaderMock,
}))

import { SpreadRotationHint } from "./SpreadRotationHint"

// The component's own timings, which these tests hold it to.
const HINT_TARGET_DEBOUNCE_MS = 100
const HINT_VISIBLE_MS = 900
/** Long enough for a hint to have both shown and gone. */
const HINT_LIFETIME_MS = HINT_TARGET_DEBOUNCE_MS + HINT_VISIBLE_MS

type SpreadMode = `auto` | `always` | `never`
type ViewportSize = { width: number; height: number }

const PLAIN_PAGE_SPINE_ITEM_INDEX = 0
const PANORAMA_LEFT_SPINE_ITEM_INDEX = 1
const PANORAMA_RIGHT_SPINE_ITEM_INDEX = 2

const createFakeSpineItem = (href: string) => ({
  item: { href },
  isReady$: new BehaviorSubject(true),
})

/**
 * The part of a reader the hint reads, starting on the left half of a panorama
 * in a free portrait viewport. It decides spreads the way `auto` does for a
 * fixed layout book: a viewport wider than tall shows one. The streams stay
 * open for the test to drive, as the reader's would.
 */
const createFakeReader = ({ withCbzEnhancer = true } = {}) => {
  const plainPage = createFakeSpineItem(`page.xhtml`)
  const panoramaLeft = createFakeSpineItem(`panorama-left.xhtml`)
  const panoramaRight = createFakeSpineItem(`panorama-right.xhtml`)
  const spineItems = [plainPage, panoramaLeft, panoramaRight]
  const panoramaSpineItems = [panoramaLeft, panoramaRight]

  const createPaginationState = (spineItemIndex: number) => ({
    begin: { spineItemIndex, pageIndexInSpineItem: 0 },
    end: { spineItemIndex, pageIndexInSpineItem: 0 },
  })

  const settings$ = new BehaviorSubject<{ spreadMode: SpreadMode }>({
    spreadMode: `auto`,
  })

  const wouldSpreadAt = ({ width, height }: ViewportSize) => {
    const { spreadMode } = settings$.value

    if (spreadMode === `never`) return false
    if (spreadMode === `always`) return true

    return width > height
  }

  const paginationState$ = new BehaviorSubject(
    createPaginationState(PANORAMA_LEFT_SPINE_ITEM_INDEX),
  )
  const viewportState$ = new BehaviorSubject<`free` | `busy`>(`free`)
  const viewport$ = new BehaviorSubject({
    width: 600,
    height: 800,
    isSpread: wouldSpreadAt({ width: 600, height: 800 }),
  })

  /** What the reader's viewport records at each layout. */
  const layoutViewport = (size: ViewportSize) => {
    const isSpread = wouldSpreadAt(size)
    const { value } = viewport$

    if (
      value.width === size.width &&
      value.height === size.height &&
      value.isSpread === isSpread
    ) {
      return
    }

    viewport$.next({ ...size, isSpread })
  }

  const reader = {
    pagination: { state$: paginationState$ },
    viewportState$,
    viewport: {
      watch: () => viewport$,
      wouldSpreadAt,
    },
    settings: {
      watch: () => settings$,
    },
    spineItemsManager: { items: spineItems },
    ...(withCbzEnhancer
      ? {
          __PROSE_READER_ENHANCER_CBZ: true,
          cbz: {
            isPanoramaSpineItem: (spineItem: unknown) =>
              panoramaSpineItems.some((item) => item === spineItem),
          },
        }
      : {}),
  }

  return {
    reader,
    spineItems,
    goToSpineItem: (spineItemIndex: number) => {
      paginationState$.next(createPaginationState(spineItemIndex))
    },
    setViewportState: (viewportState: `free` | `busy`) => {
      viewportState$.next(viewportState)
    },
    /** A new spread mode, and the layout it causes. */
    setSpreadMode: (spreadMode: SpreadMode) => {
      settings$.next({ spreadMode })
      layoutViewport(viewport$.value)
    },
  }
}

describe(`SpreadRotationHint`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderHint = async (
    fakeReader: ReturnType<typeof createFakeReader>,
  ) => {
    useReaderMock.mockReturnValue(fakeReader.reader)

    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <SpreadRotationHint />
        </ChakraProvider>,
      )
    })
  }

  const advanceTime = async (durationMs: number) => {
    await act(async () => {
      vi.advanceTimersByTime(durationMs)
    })
  }

  /**
   * Advances time in small steps, which React renders in between, and tells
   * whether the hint showed at any of them.
   */
  const wasHintShownDuring = async (durationMs: number) => {
    let wasHintShown = isHintShown()

    for (let elapsedMs = 0; elapsedMs < durationMs; elapsedMs += 10) {
      await advanceTime(Math.min(10, durationMs - elapsedMs))
      wasHintShown ||= isHintShown()
    }

    return wasHintShown
  }

  const actOnReader = async (change: () => void) => {
    await act(async () => {
      change()
    })
  }

  // A dismissed hint stays in the DOM, closed, until its fade-out ends, and
  // happy-dom never ends an animation.
  const isHintShown = () =>
    container.querySelector(
      `[data-scope="presence"][data-state="open"] [data-spread-rotation-hint]`,
    ) !== null

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    vi.useFakeTimers()
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.useRealTimers()
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
    container.remove()
  })

  it(`shows on a panorama half once the reader has stayed on it for 100 ms, for 900 ms`, async () => {
    const fakeReader = createFakeReader()

    await renderHint(fakeReader)
    await advanceTime(HINT_TARGET_DEBOUNCE_MS - 1)

    expect(isHintShown()).toBe(false)

    await advanceTime(1)

    expect(isHintShown()).toBe(true)

    await advanceTime(HINT_VISIBLE_MS - 1)

    expect(isHintShown()).toBe(true)

    await advanceTime(1)

    expect(isHintShown()).toBe(false)
  })

  it(`shows again on the other half of the panorama`, async () => {
    const fakeReader = createFakeReader()

    await renderHint(fakeReader)
    await advanceTime(HINT_TARGET_DEBOUNCE_MS)

    expect(isHintShown()).toBe(true)

    await advanceTime(HINT_VISIBLE_MS)

    expect(isHintShown()).toBe(false)

    await actOnReader(() => {
      fakeReader.goToSpineItem(PANORAMA_RIGHT_SPINE_ITEM_INDEX)
    })
    await advanceTime(HINT_TARGET_DEBOUNCE_MS)

    expect(isHintShown()).toBe(true)
  })

  it(`does not show on a page that is not a panorama half`, async () => {
    const fakeReader = createFakeReader()
    fakeReader.goToSpineItem(PLAIN_PAGE_SPINE_ITEM_INDEX)

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)
  })

  it(`does not show when the reader has no cbz enhancer`, async () => {
    const fakeReader = createFakeReader({ withCbzEnhancer: false })

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)
  })

  it(`does not show while the viewport shows a spread already`, async () => {
    const fakeReader = createFakeReader()
    fakeReader.setSpreadMode(`always`)

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)
  })

  it(`does not show when rotating would not show a spread`, async () => {
    const fakeReader = createFakeReader()
    fakeReader.setSpreadMode(`never`)

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)
  })

  // A spread mode change that does not change what the viewport shows now
  // lays out nothing the hint watches on the viewport.
  it(`shows once the spread mode lets a rotation show a spread`, async () => {
    const fakeReader = createFakeReader()
    fakeReader.setSpreadMode(`never`)

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)

    await actOnReader(() => {
      fakeReader.setSpreadMode(`auto`)
    })
    await advanceTime(HINT_TARGET_DEBOUNCE_MS)

    expect(isHintShown()).toBe(true)
  })

  it(`waits for the panorama half to be ready`, async () => {
    const fakeReader = createFakeReader()
    const panoramaLeft = fakeReader.spineItems[PANORAMA_LEFT_SPINE_ITEM_INDEX]
    panoramaLeft?.isReady$.next(false)

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)

    await actOnReader(() => {
      panoramaLeft?.isReady$.next(true)
    })
    await advanceTime(HINT_TARGET_DEBOUNCE_MS)

    expect(isHintShown()).toBe(true)
  })

  it(`waits for the viewport to be free, as it is not during a page turn`, async () => {
    const fakeReader = createFakeReader()
    fakeReader.setViewportState(`busy`)

    await renderHint(fakeReader)

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)

    await actOnReader(() => {
      fakeReader.setViewportState(`free`)
    })
    await advanceTime(HINT_TARGET_DEBOUNCE_MS)

    expect(isHintShown()).toBe(true)
  })

  it(`does not show on a panorama half the reader leaves within 100 ms`, async () => {
    const fakeReader = createFakeReader()
    fakeReader.goToSpineItem(PLAIN_PAGE_SPINE_ITEM_INDEX)

    await renderHint(fakeReader)
    await advanceTime(HINT_TARGET_DEBOUNCE_MS)
    await actOnReader(() => {
      fakeReader.goToSpineItem(PANORAMA_LEFT_SPINE_ITEM_INDEX)
    })

    expect(await wasHintShownDuring(HINT_TARGET_DEBOUNCE_MS - 1)).toBe(false)

    await actOnReader(() => {
      fakeReader.goToSpineItem(PLAIN_PAGE_SPINE_ITEM_INDEX)
    })

    expect(await wasHintShownDuring(HINT_LIFETIME_MS)).toBe(false)
  })
})
