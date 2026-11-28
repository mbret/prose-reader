import { createReader, DocumentRenderer, type Reader } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { EMPTY, type Observable, of, Subject } from "rxjs"
import { afterEach, beforeAll, vi } from "vitest"
import { narrationEnhancer } from "../narrationEnhancer.ts"
import type {
  NarrationEnhancerAPI,
  NarrationProgress,
  NarrationSource,
  NarrationState,
  SpineItemNarration,
} from "../types.ts"

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

  onLayout(): Observable<{ width: number; height: number } | undefined> {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame(): HTMLIFrameElement | undefined {
    return undefined
  }
}

const createManifest = (numberOfSpineItems: number): Manifest => ({
  filename: "test",
  mediaType: "application/epub+zip",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: Array.from({ length: numberOfSpineItems }, (_, index) => ({
    href: `/page_${index}.xhtml`,
    containerUri: `page_${index}.xhtml`,
    id: `${index}`,
    index,
    mediaType: "application/xhtml+xml",
    progressionWeight: 1 / numberOfSpineItems,
    renditionLayout: "pre-paginated",
  })),
})

/** jsdom has neither observer, and nothing here depends on what they report. */
class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const giveElementsTheViewportSize = () => {
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
}

export type NarrationReader = Reader & NarrationEnhancerAPI

const readers: { destroy: () => void }[] = []

/**
 * Gives every test of the file the environment the reader needs in jsdom,
 * and destroys the readers a test mounted once it ends.
 */
export const installNarrationReaderTestEnvironment = () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", InertObserver)
    vi.stubGlobal("IntersectionObserver", InertObserver)
    giveElementsTheViewportSize()
  })

  afterEach(() => {
    for (const reader of readers.splice(0)) reader.destroy()
    document.body.replaceChildren()
    vi.useRealTimers()
  })
}

/** A reader that shows the first of its spine items. */
export const mountNarrationReader = async (
  sources: readonly NarrationSource[],
  { numberOfSpineItems = 3 }: { numberOfSpineItems?: number } = {},
): Promise<NarrationReader> => {
  vi.useFakeTimers()

  const reader = narrationEnhancer(createReader)({
    manifest: createManifest(numberOfSpineItems),
    getRenderer: () => (props) => new EmptyRenderer(props),
    getResource: () => of(new Response("", { status: 200 })),
    narration: { sources },
  })
  readers.push(reader)

  const container = document.createElement("div")
  document.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  return reader
}

/**
 * The cfi of a unit of a spine item of the book: ten characters of its text,
 * with the units of a spine item one after the other.
 */
export const cfiOfUnit = (spineItemIndex: number, unitIndex: number) =>
  `epubcfi(/6/${(spineItemIndex + 1) * 2}[${spineItemIndex}]!/4/2/1,:${unitIndex * 20},:${unitIndex * 20 + 10})`

/** Every state the narration of a reader goes through, from the current one. */
export const recordNarrationStates = (reader: NarrationReader) => {
  const states: NarrationState[] = []

  reader.narration.state$.subscribe((state) => states.push(state))

  return states
}

/** One call of `play()` on the narration of a spine item. */
type ControlledPlayback = {
  startUnitIndex: number
  /** Whether the enhancer still listens. It stops the sound by unsubscribing. */
  readonly isSubscribed: boolean
  reportUnitHeard: (unitIndex: number) => void
  complete: () => void
  fail: (error: unknown) => void
}

/** One request of the enhancer for the narration of a spine item. */
type ControlledNarrationRequest = {
  spineItemIndex: number
  /** Whether the enhancer still waits for the answer. */
  readonly isSubscribed: boolean
  /** Answers with as many units as cfis, or with nothing for the item. */
  answerWithUnits: (cfis: string[] | undefined) => void
  fail: (error: unknown) => void
}

/**
 * A source that answers only when the test tells it to, so that a test can
 * act while a request or a playback is under way.
 */
export const createControlledSource = () => {
  const narrationRequests: ControlledNarrationRequest[] = []
  const playbacks: ControlledPlayback[] = []

  const createNarration = (cfis: string[]): SpineItemNarration => ({
    units: cfis.map((cfi) => ({ cfi })),
    play: ({ startUnitIndex }) => {
      const progressSubject = new Subject<NarrationProgress>()

      playbacks.push({
        startUnitIndex,
        get isSubscribed() {
          return progressSubject.observed
        },
        reportUnitHeard: (unitIndex) => progressSubject.next({ unitIndex }),
        complete: () => progressSubject.complete(),
        fail: (error) => progressSubject.error(error),
      })

      return progressSubject
    },
  })

  const source: NarrationSource = {
    getNarrationOfSpineItem: ({ spineItem }) => {
      const answerSubject = new Subject<SpineItemNarration | undefined>()

      narrationRequests.push({
        spineItemIndex: spineItem.index,
        get isSubscribed() {
          return answerSubject.observed
        },
        answerWithUnits: (cfis) => {
          answerSubject.next(cfis ? createNarration(cfis) : undefined)
          answerSubject.complete()
        },
        fail: (error) => answerSubject.error(error),
      })

      return answerSubject
    },
  }

  return { source, narrationRequests, playbacks }
}
