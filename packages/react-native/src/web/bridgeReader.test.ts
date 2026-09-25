// @vitest-environment jsdom
import { createReader, type Manifest, type Reader } from "@prose-reader/core"
import { of, Subject } from "rxjs"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import type { ReaderLoadOptions } from "../shared"
import { bridgeReader, createReaderBridge } from "."

/**
 * The webview side of the bridge, standing in for `@webview-bridge/web`,
 * which needs a real React Native WebView to talk to. `emit` is what a
 * `postMessage` from the native side triggers.
 */
const { fakeBridges } = vi.hoisted(() => {
  const createFakeBridge = () => {
    const listeners = new Map<string, ((data: unknown) => void)[]>()

    return {
      addEventListener: (event: string, listener: (data: unknown) => void) => {
        listeners.set(event, [...(listeners.get(event) ?? []), listener])
      },
      report: vi.fn(
        async (_load: number, _state: Record<string, unknown>) => {},
      ),
      emit: (event: string, data?: unknown) => {
        for (const listener of listeners.get(event) ?? []) {
          listener(data)
        }
      },
    }
  }

  return {
    fakeBridges: {
      created: [] as ReturnType<typeof createFakeBridge>[],
      create: createFakeBridge,
    },
  }
})

vi.mock("@webview-bridge/web", () => ({
  linkBridge: () => {
    const bridge = fakeBridges.create()

    fakeBridges.created.push(bridge)

    return bridge
  },
}))

const manifest: Manifest = {
  filename: "",
  items: [],
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
  spineItems: [
    {
      href: "/chapter_1/page_1.jpg",
      id: "1",
      pageSpreadLeft: true,
      pageSpreadRight: true,
      progressionWeight: 0,
      renditionLayout: "pre-paginated",
      index: 0,
    },
    {
      href: "/chapter_2/page_1.jpg",
      id: "2",
      pageSpreadLeft: true,
      pageSpreadRight: true,
      progressionWeight: 0,
      renditionLayout: "pre-paginated",
      index: 1,
    },
  ],
  title: "",
}

/** The start of the second spine item, somewhere other than the book's start. */
const secondChapterCfi = "epubcfi(/6/4[2]!)"

beforeAll(() => {
  // jsdom has no layout engine, so neither observer exists there
  for (const observer of ["ResizeObserver", "IntersectionObserver"]) {
    vi.stubGlobal(
      observer,
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      },
    )
  }
})

afterAll(() => {
  vi.unstubAllGlobals()
})

let container: HTMLElement

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

const createTestReader = (options: ReaderLoadOptions) =>
  createReader({
    ...options,
    getResource: () => of(new Response("", { status: 200 })),
  })

const currentReadingPosition = (reader: Reader) => {
  let readingPosition: string | undefined

  reader.navigation.readingPosition$
    .subscribe((value) => {
      readingPosition = value
    })
    .unsubscribe()

  return readingPosition
}

const linkNativeSide = () => {
  const bridge = createReaderBridge()
  const native = fakeBridges.created.at(-1)

  if (!native) throw new Error("createReaderBridge did not link a bridge")

  let loads = 0

  /** Sends a book the way the native side's `load` does, numbering each. */
  const load = (options?: Omit<ReaderLoadOptions, "manifest">) =>
    native.emit("load", {
      load: ++loads,
      options: { manifest, ...options },
    })

  /** Every value reported for `key`, with the load it was tagged with. */
  const reported = (key: string) =>
    native.report.mock.calls
      .filter(([, state]) => key in state)
      .map(([load, state]) => [load, state[key]])

  return { bridge, native, load, reported }
}

const setup = () => {
  const { bridge, native, load, reported } = linkNativeSide()
  const readers: Reader[] = []
  const loadOptions: ReaderLoadOptions[] = []
  let failNextReader = false

  const controller = bridgeReader({
    bridge,
    containerElement: container,
    createReader: (options) => {
      loadOptions.push(options)

      if (failNextReader) throw new Error("invalid book")

      const reader = createTestReader(options)

      readers.push(reader)

      return reader
    },
  })

  const reader = (index: number) => {
    const found = readers[index]

    if (!found) throw new Error(`no reader was created at ${index}`)

    return found
  }

  const failNextLoad = () => {
    failNextReader = true
  }

  return {
    controller,
    native,
    load,
    reported,
    reader,
    loadOptions,
    failNextLoad,
  }
}

describe("Given a bridged webview", () => {
  it("has no reader before the native side sends a book", () => {
    const { controller, native } = setup()

    expect(controller.getReader()).toBeUndefined()
    expect(() => native.emit("turnRight")).not.toThrow()
  })

  describe("when the native side sends a book", () => {
    it("renders it with a reader mounted in the container", () => {
      const { controller, load, reader } = setup()

      load()

      expect(controller.getReader()).toBe(reader(0))
      expect(container.children.length).toBeGreaterThan(0)
    })

    it("reports the reader's context to the native side, without its root element", () => {
      const { load, reported } = setup()

      load()

      expect(reported("context")).not.toHaveLength(0)

      for (const [, context] of reported("context")) {
        expect(context).toMatchObject({ manifest })
        expect(context).not.toHaveProperty("rootElement")
      }
    })

    it("reports the reader's pagination to the native side", () => {
      const { load, reported, reader } = setup()

      load()

      expect(reported("pagination").at(-1)).toEqual([
        1,
        reader(0).pagination.state,
      ])
    })

    it("reports the reader's reading position to the native side", () => {
      const { load, reported, reader } = setup()

      load()

      expect(reported("readingPosition").at(-1)).toEqual([
        1,
        currentReadingPosition(reader(0)),
      ])
    })
  })

  describe("when the native side sends a book with a cfi to open at", () => {
    it("hands the book and the cfi to the factory", () => {
      const { load, loadOptions } = setup()

      load({ cfi: secondChapterCfi })

      expect(loadOptions).toEqual([{ manifest, cfi: secondChapterCfi }])
    })

    /**
     * Any value the native side receives is one it may save, so the start of
     * the book, where the reader is not, must never be one.
     */
    it("reports that cfi as the first reading position, never the start of the book before it", () => {
      const { load, reported } = setup()

      load({ cfi: secondChapterCfi })

      expect(reported("readingPosition")).toEqual([[1, secondChapterCfi]])
    })

    it("turns the reader's pages on the native side's commands", () => {
      const { native, load, reader } = setup()

      load()

      const turnRight = vi.spyOn(reader(0).navigation, "turnRight")
      const turnLeft = vi.spyOn(reader(0).navigation, "turnLeft")

      native.emit("turnRight")
      native.emit("turnLeft")

      expect(turnRight).toHaveBeenCalledOnce()
      expect(turnLeft).toHaveBeenCalledOnce()
    })
  })

  describe("when the native side sends another book", () => {
    it("replaces the reader, so the container only ever holds one", () => {
      const { controller, load, reader } = setup()

      load()

      const previousElements = [...container.children]

      load()

      expect(controller.getReader()).toBe(reader(1))
      expect(container.children).toHaveLength(previousElements.length)

      for (const element of previousElements) {
        expect(container.contains(element)).toBe(false)
      }
    })

    it("tags every report of the new reader with the new load", () => {
      const { native, load } = setup()

      load()
      native.report.mockClear()
      load()

      expect(native.report).toHaveBeenCalled()

      for (const [reportedLoad] of native.report.mock.calls) {
        expect(reportedLoad).toBe(2)
      }
    })

    it("stops listening to the previous reader, even if its state never completes", () => {
      const { bridge, load, reported } = linkNativeSide()
      const pagination = new Subject<Record<string, unknown>>()
      const context = new Subject<Record<string, unknown>>()
      const readingPosition = new Subject<string>()
      // Only the members bridgeReader touches. A destroyed core reader does
      // not complete its pagination stream, and none of these streams
      // completes here, so only unsubscribing can release them.
      const previous = {
        context,
        destroy: () => {},
        mount: () => {},
        navigation: {
          readingPosition$: readingPosition,
          turnLeft: () => {},
          turnRight: () => {},
        },
        pagination: { state$: pagination },
      } as unknown as Reader
      let loads = 0

      bridgeReader({
        bridge,
        containerElement: container,
        createReader: (options) =>
          loads++ === 0 ? previous : createTestReader(options),
      })

      load()

      expect(pagination.observed).toBe(true)
      expect(context.observed).toBe(true)
      expect(readingPosition.observed).toBe(true)

      load()

      expect(pagination.observed).toBe(false)
      expect(context.observed).toBe(false)
      expect(readingPosition.observed).toBe(false)

      readingPosition.next(secondChapterCfi)

      expect(reported("readingPosition")).not.toContainEqual([
        expect.anything(),
        secondChapterCfi,
      ])
    })

    it("turns the pages of the new reader only", () => {
      const { native, load, reader } = setup()

      load()
      load()

      const previous = vi.spyOn(reader(0).navigation, "turnRight")
      const current = vi.spyOn(reader(1).navigation, "turnRight")

      native.emit("turnRight")

      expect(previous).not.toHaveBeenCalled()
      expect(current).toHaveBeenCalledOnce()
    })
  })

  describe("when the reader for another book fails to build", () => {
    it("leaves no reader behind, rather than the destroyed one", () => {
      const { controller, native, load, reader, failNextLoad } = setup()

      load()

      const destroyed = reader(0)
      const turnRight = vi.spyOn(destroyed.navigation, "turnRight")

      failNextLoad()

      expect(load).toThrow("invalid book")
      expect(controller.getReader()).toBeUndefined()
      expect(container.children).toHaveLength(0)

      native.emit("turnRight")

      expect(turnRight).not.toHaveBeenCalled()
    })
  })
})
