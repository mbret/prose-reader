// @vitest-environment jsdom
import {
  createReader,
  DocumentRenderer,
  type Manifest,
  type Navigation,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  combineLatest,
  config,
  EMPTY,
  filter,
  first,
  map,
  of,
  skip,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { gesturesEnhancer } from "./index"

/**
 * Drives the enhancer on a mounted reader with the pointer events a browser
 * delivers. The test holds the clock, and runs whatever the reader schedules
 * until none is left, so what a gesture has not done by then it never does.
 */

/** jsdom has no layout, so every element reports this size. */
const viewport = { width: 400, height: 600 }

/** Renders each item as an empty element, so it is ready once loaded. */
class EmptyRenderer extends DocumentRenderer {
  onUnload() {}

  onCreateDocument() {
    return of(this.context.document.createElement("div"))
  }

  onLoadDocument() {
    return EMPTY
  }

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    return undefined
  }
}

/** Two single pages, so what is visible is unambiguous. */
const manifest: Manifest = {
  filename: "test",
  mediaType: "application/vnd.comicbook+zip",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    href: `/page_${index}.jpg`,
    containerUri: `page_${index}.jpg`,
    id: `${index}`,
    index,
    mediaType: "image/jpeg",
    progressionWeight: 0.5,
    renditionLayout: "pre-paginated",
  })),
}

/** jsdom has neither observer, and nothing here depends on what they report. */
class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * jsdom has no DOMMatrix either, and a pan reads the viewport's translation
 * with one. The reader only ever writes `translate(<x>px, <y>px)`, which jsdom
 * hands back as `translate(<x>px)` when `y` is 0, so this reads both forms
 * and refuses anything else.
 */
class TranslationMatrix {
  readonly e: number
  readonly f: number

  constructor(transform: string) {
    const match = /^translate\((-?[\d.]+)px(?:, (-?[\d.]+)px)?\)$/.exec(
      transform,
    )

    if (!match) throw new Error(`Unexpected transform: ${transform}`)

    this.e = Number(match[1])
    this.f = Number(match[2] ?? 0)
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", InertObserver)
  vi.stubGlobal("IntersectionObserver", InertObserver)
  vi.stubGlobal("DOMMatrix", TranslationMatrix)
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => viewport.width,
  })
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => viewport.height,
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, viewport.width, viewport.height),
  )
})

/**
 * Holds every layout while held, so that the spine publishes no pages until
 * it is released.
 */
const createLayoutHold = () => {
  const isLayoutHeld = new BehaviorSubject(true)

  class HeldLayoutRenderer extends EmptyRenderer {
    onLayout() {
      return isLayoutHeld.pipe(
        first((isHeld) => !isHeld),
        map(() => undefined),
      )
    }
  }

  return {
    Renderer: HeldLayoutRenderer,
    release: () => isLayoutHeld.next(false),
  }
}

const createGesturesReader = (
  ownerDocument?: Document,
  Renderer: typeof EmptyRenderer = EmptyRenderer,
) =>
  gesturesEnhancer(createReader)({
    manifest,
    ownerDocument,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
  })

const readers: { destroy: () => void }[] = []

const onUnhandledError = config.onUnhandledError

afterEach(() => {
  config.onUnhandledError = onUnhandledError
  for (const reader of readers.splice(0)) reader.destroy()
  document.body.replaceChildren()
  vi.useRealTimers()
})

const excludeFromCleanup = (reader: { destroy: () => void }) => {
  readers.splice(readers.indexOf(reader), 1)
}

/**
 * A mounted reader, recording every user navigation and gesture from then on.
 */
const mountGesturesReader = async ({
  container = document.createElement("div"),
  Renderer,
}: {
  container?: HTMLElement
  Renderer?: typeof EmptyRenderer
} = {}) => {
  vi.useFakeTimers()

  const reader = createGesturesReader(undefined, Renderer)
  readers.push(reader)

  document.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  const navigations: Navigation[] = []
  reader.navigation.navigation$
    .pipe(
      // skip the replayed current one
      skip(1),
      filter((navigation) => navigation.triggeredBy === "user"),
    )
    .subscribe((navigation) => navigations.push(navigation))

  const gestures: { type: string; handled?: boolean }[] = []
  const gesturesErrors: unknown[] = []
  reader.gestures.gestures$.subscribe({
    next: (gesture) => {
      gestures.push(
        gesture.type === "tap"
          ? { type: gesture.type, handled: gesture.handled }
          : { type: gesture.type },
      )
    },
    error: (error) => gesturesErrors.push(error),
  })

  /**
   * Dispatches a pointer event on the reader's container, halfway down, as a
   * browser does: `button` is -1 on a move, and `buttons` holds the primary
   * button until the release. gesturx reads a mouse move with no button held
   * as a release the page missed.
   */
  const dispatchPointer = ({
    type,
    pointerId,
    pointerType,
    clientX,
  }: {
    type: "pointerdown" | "pointermove" | "pointerup"
    pointerId: number
    pointerType: "mouse" | "touch"
    clientX: number
  }) => {
    const target = reader.context.value.rootElement

    if (!target) throw new Error("the reader is not mounted")

    target.dispatchEvent(
      new PointerEvent(type, {
        pointerId,
        isPrimary: pointerId === 1,
        pointerType,
        button: type === "pointermove" ? -1 : 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX,
        clientY: viewport.height / 2,
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  /**
   * Presses at `x` with the mouse, moves `distance` to the right in five steps
   * a frame apart, and lets go unless told not to. It is over within the time
   * a tap allows.
   */
  const drag = async ({
    x,
    distance,
    letGo = true,
  }: {
    x: number
    distance: number
    letGo?: boolean
  }) => {
    const mouse = { pointerId: 1, pointerType: "mouse" as const }

    dispatchPointer({ ...mouse, type: "pointerdown", clientX: x })

    for (let step = 1; step <= 5; step++) {
      await vi.advanceTimersByTimeAsync(16)
      dispatchPointer({
        ...mouse,
        type: "pointermove",
        clientX: x + (distance * step) / 5,
      })
    }

    await vi.advanceTimersByTimeAsync(16)

    if (letGo)
      dispatchPointer({ ...mouse, type: "pointerup", clientX: x + distance })

    await vi.runAllTimersAsync()
  }

  /**
   * Presses two fingers 40px apart at `x`, then moves both `distance` to the
   * right while they spread `spread` further apart, in five steps a frame
   * apart, and lets go.
   */
  const pinch = async ({
    x,
    distance,
    spread,
  }: {
    x: number
    distance: number
    spread: number
  }) => {
    const fingerAt = (pointerId: number, step: number) => {
      const side = pointerId === 1 ? -1 : 1
      const offset = (distance * step) / 5
      const halfSpread = (spread * step) / 10

      return x + side * (20 + halfSpread) + offset
    }
    const fingers = [1, 2]
    const dispatchFingers = (
      type: "pointerdown" | "pointermove" | "pointerup",
      step: number,
    ) => {
      for (const pointerId of fingers) {
        dispatchPointer({
          type,
          pointerId,
          pointerType: "touch",
          clientX: fingerAt(pointerId, step),
        })
      }
    }

    dispatchFingers("pointerdown", 0)

    for (let step = 1; step <= 5; step++) {
      await vi.advanceTimersByTimeAsync(16)
      dispatchFingers("pointermove", step)
    }

    await vi.advanceTimersByTimeAsync(16)
    dispatchFingers("pointerup", 5)
    await vi.runAllTimersAsync()
  }

  return { reader, navigations, gestures, gesturesErrors, drag, pinch }
}

/**
 * A reader settled on its first page, recording every user navigation and
 * gesture from then on.
 */
const onFirstPage = async (container?: HTMLElement) => {
  const mountedReader = await mountGesturesReader({ container })

  expect(mountedReader.reader.pagination.state).toMatchObject({
    isSettled: true,
    begin: { spineItemIndex: 0 },
  })

  return mountedReader
}

describe("Given a reader on its first page", () => {
  /**
   * Moving right on the first page pans towards a page before the first one,
   * so a pan that started here would navigate out of the book.
   */
  it("does not navigate for a drag shorter than the pan threshold, away from the page turn margins", async () => {
    const { reader, navigations, gestures, drag } = await onFirstPage()

    await drag({ x: viewport.width / 2, distance: 5 })

    // The gesture was recognized, as a tap and not as a pan.
    expect(gestures).toEqual([{ type: "tap", handled: false }])
    expect(navigations).toEqual([])
    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 0 },
    })
  })

  // Without this one, the test above would pass for a drag that could never
  // start a pan, or a harness that never sees a navigation.
  it("pans for a drag from the same place past the pan threshold", async () => {
    const { navigations, gestures, drag } = await onFirstPage()

    await drag({ x: viewport.width / 2, distance: 30 })

    expect(gestures.map(({ type }) => type)).toContain("pan")
    expect(navigations.length).toBeGreaterThan(0)
  })
})

/**
 * A pan that moves the page holds the navigation until it is stopped: while
 * held, the reader neither restores, paginates nor moves its reading
 * position. However the pan ends, the navigation must not stay held.
 */
describe("Given a pan moving the page", () => {
  const isNavigationLocked = (reader: ReturnType<typeof createReader>) => {
    let isLocked: boolean | undefined

    reader.navigation.isLocked$
      .subscribe((value) => {
        isLocked = value
      })
      .unsubscribe()

    return isLocked
  }

  it("releases the navigation when a gestures setting changes before the user lets go", async () => {
    const { reader, drag } = await onFirstPage()

    // Towards the second page, still held.
    await drag({ x: viewport.width / 2, distance: -60, letGo: false })

    expect(isNavigationLocked(reader)).toBe(true)

    reader.gestures.settings.update({ zoomMaxScale: 4 })
    await vi.runAllTimersAsync()

    expect(isNavigationLocked(reader)).toBe(false)
    expect(reader.pagination.state.isSettled).toBe(true)
  })

  /**
   * Whoever reacts to the lock the pan takes does so before `start()` has
   * returned. Changing a gestures setting then ends the pan right there.
   */
  it("releases the navigation when a gestures setting changes as the pan takes it", async () => {
    const { reader, drag } = await onFirstPage()
    let hasChangedSetting = false

    reader.navigation.isLocked$.pipe(filter(Boolean), first()).subscribe(() => {
      hasChangedSetting = true
      reader.gestures.settings.update({ zoomMaxScale: 4 })
    })

    await drag({ x: viewport.width / 2, distance: -60, letGo: false })

    expect(hasChangedSetting).toBe(true)
    expect(isNavigationLocked(reader)).toBe(false)
    expect(reader.pagination.state.isSettled).toBe(true)
  })

  it("lets the reader be destroyed before the user lets go", async () => {
    const { reader, drag } = await onFirstPage()

    await drag({ x: viewport.width / 2, distance: -60, letGo: false })

    expect(isNavigationLocked(reader)).toBe(true)
    excludeFromCleanup(reader)
    expect(() => reader.destroy()).not.toThrow()
  })
})

describe("Given a subscriber to the gestures", () => {
  it("is completed once the reader is destroyed", () => {
    const reader = createGesturesReader()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const onGesturesComplete = vi.fn()

    reader.gestures.gestures$.subscribe({ complete: onGesturesComplete })
    reader.mount(container)
    reader.destroy()

    expect(onGesturesComplete).toHaveBeenCalled()
  })

  it("is completed when it only subscribes once the reader is destroyed", () => {
    const reader = createGesturesReader()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const onGesturesComplete = vi.fn()

    reader.mount(container)
    reader.destroy()
    const subscription = reader.gestures.gestures$.subscribe({
      complete: onGesturesComplete,
    })

    expect(onGesturesComplete).toHaveBeenCalled()
    expect(subscription.closed).toBe(true)
  })
})

describe("Given a mounted reader", () => {
  it("gives the elements of its container no touch action either", async () => {
    const { reader } = await onFirstPage()
    const scrollNavigator = reader.context.value.rootElement?.querySelector(
      "[data-prose-reader-scroll-navigator]",
    )

    if (!scrollNavigator) throw new Error("the reader has no scroll navigator")

    expect(getComputedStyle(scrollNavigator).touchAction).toBe("none")
  })

  it("gives no touch action to a container in the document it was created for", () => {
    const frame = document.createElement("iframe")
    document.body.appendChild(frame)
    const frameDocument = frame.contentDocument
    const frameWindow = frameDocument?.defaultView

    if (!frameDocument || !frameWindow)
      throw new Error("the frame has no window")

    const reader = createGesturesReader(frameDocument)
    readers.push(reader)
    const container = frameDocument.createElement("div")
    frameDocument.body.appendChild(container)
    reader.mount(container)

    expect(frameWindow.getComputedStyle(container).touchAction).toBe("none")
  })
})

describe("Given two fingers that spread while they move, which both pinches and pans", () => {
  const gestureTypes = (gestures: { type: string }[]) =>
    new Set(gestures.map(({ type }) => type))

  it("does not pan while the pinch runs", async () => {
    const { gestures, pinch } = await onFirstPage()

    await pinch({ x: viewport.width / 2, distance: -60, spread: 60 })

    expect(gestureTypes(gestures)).toEqual(new Set(["pinch"]))
  })

  it("pans too when pinchCancelPan is off", async () => {
    const { reader, gestures, pinch } = await onFirstPage()

    reader.gestures.settings.update({ pinchCancelPan: false })
    await pinch({ x: viewport.width / 2, distance: -60, spread: 60 })

    expect(gestureTypes(gestures)).toEqual(new Set(["pinch", "pan"]))
  })

  it("stops panning once pinchCancelPan is on again", async () => {
    const { reader, gestures, pinch } = await onFirstPage()

    reader.gestures.settings.update({ pinchCancelPan: false })
    reader.gestures.settings.update({ pinchCancelPan: true })
    await pinch({ x: viewport.width / 2, distance: -60, spread: 60 })

    expect(gestureTypes(gestures)).toEqual(new Set(["pinch"]))
  })
})

describe("Given a reader a gesture was made on", () => {
  it("leaves the container as it found it once destroyed", async () => {
    const container = document.createElement("div")
    container.classList.add("app-container")
    container.style.touchAction = "pan-y"
    const containerBeforeMount = container.outerHTML
    const addEventListener = vi.spyOn(container, "addEventListener")
    const removeEventListener = vi.spyOn(container, "removeEventListener")
    const { reader, drag } = await onFirstPage(container)

    await drag({ x: viewport.width / 2, distance: 0 })
    const touchActionWhileMounted = getComputedStyle(container).touchAction
    excludeFromCleanup(reader)
    reader.destroy()

    const addedListeners = addEventListener.mock.calls.map(
      ([type, listener]) => ({ type, listener }),
    )
    const removedListeners = removeEventListener.mock.calls.map(
      ([type, listener]) => ({ type, listener }),
    )

    expect(touchActionWhileMounted).toBe("none")
    expect(addedListeners).not.toEqual([])
    expect(removedListeners).toEqual(expect.arrayContaining(addedListeners))
    expect(container.outerHTML).toBe(containerBeforeMount)
  })
})

/**
 * From its creation to its first published pages, a reader has no page to
 * give a tap. A `beforeTapGesture` hook that reads something derived from the
 * pages with `withLatestFrom`, as react-reader's bookmark hook reads the
 * annotation candidates, can then complete with no verdict. Such a tap must
 * go on, and must not stop the gestures.
 */
describe("Given a reader whose first layout has not ended", () => {
  it("recognizes taps and pans once its pages are published, after a hook gave no verdict on a tap before them", async () => {
    // What the enhancer's own subscription to the gestures would throw, so
    // that the test fails on what it checks rather than on the throw.
    const unhandledErrors: unknown[] = []
    config.onUnhandledError = (error) => {
      unhandledErrors.push(error)
    }
    const layoutHold = createLayoutHold()
    const { reader, gestures, gesturesErrors, navigations, drag } =
      await mountGesturesReader({
        Renderer: layoutHold.Renderer,
      })
    /**
     * One value per published page, from `combineLatest`, which emits
     * nothing for an empty list: the hook gives no verdict until the reader
     * has pages, and a verdict once it has.
     */
    const isTapAllowedOnEachPage$ = reader.layoutInfo$.pipe(
      switchMap(({ pages }) => combineLatest(pages.map(() => of(true)))),
    )
    const verdicts: boolean[] = []
    reader.gestures.hooks.register("beforeTapGesture", ({ event$ }) =>
      event$.pipe(
        withLatestFrom(isTapAllowedOnEachPage$),
        map(() => true),
        tap((verdict) => verdicts.push(verdict)),
      ),
    )

    expect(reader.spine.pages.value.pages).toEqual([])

    await drag({ x: viewport.width / 2, distance: 0 })

    expect(verdicts).toEqual([])
    expect(gestures).toEqual([{ type: "tap", handled: false }])

    layoutHold.release()
    await vi.runAllTimersAsync()

    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 0 },
    })

    await drag({ x: viewport.width / 2, distance: 0 })
    await drag({ x: viewport.width / 2, distance: -60 })

    expect(verdicts).toEqual([true])
    expect(gestures.filter(({ type }) => type === "tap")).toEqual([
      { type: "tap", handled: false },
      { type: "tap", handled: false },
    ])
    expect(gestures.map(({ type }) => type)).toContain("pan")
    expect(navigations.length).toBeGreaterThan(0)
    expect(gesturesErrors).toEqual([])
    expect(unhandledErrors).toEqual([])
  })
})
