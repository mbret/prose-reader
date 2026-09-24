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
      setPagination: vi.fn(async (_pagination: unknown) => {}),
      setContext: vi.fn(async (_context: unknown) => {}),
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
  ],
  title: "",
}

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

const createTestReader = (manifest: Manifest) =>
  createReader({
    getResource: () => of(new Response("", { status: 200 })),
    manifest,
  })

const linkNativeSide = () => {
  const bridge = createReaderBridge()
  const native = fakeBridges.created.at(-1)

  if (!native) throw new Error("createReaderBridge did not link a bridge")

  const load = () => native.emit("load", { manifest })

  return { bridge, native, load }
}

const setup = () => {
  const { bridge, native, load } = linkNativeSide()
  const readers: Reader[] = []
  let failNextReader = false

  const controller = bridgeReader({
    bridge,
    containerElement: container,
    createReader: (manifest) => {
      if (failNextReader) throw new Error("invalid book")

      const reader = createTestReader(manifest)

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

  return { controller, native, load, reader, failNextLoad }
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
      const { native, load } = setup()

      load()

      expect(native.setContext).toHaveBeenCalled()

      for (const [context] of native.setContext.mock.calls) {
        expect(context).toMatchObject({ manifest })
        expect(context).not.toHaveProperty("rootElement")
      }
    })

    it("reports the reader's pagination to the native side", () => {
      const { native, load, reader } = setup()

      load()

      expect(native.setPagination).toHaveBeenLastCalledWith(
        reader(0).pagination.state,
      )
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

    it("stops listening to the previous reader, even if its state never completes", () => {
      const { bridge, load } = linkNativeSide()
      const pagination = new Subject<Record<string, unknown>>()
      const context = new Subject<Record<string, unknown>>()
      // Only the members bridgeReader touches. A destroyed core reader does
      // not complete its pagination stream, and neither stream completes
      // here, so only unsubscribing can release them.
      const previous = {
        context,
        destroy: () => {},
        mount: () => {},
        navigation: { turnLeft: () => {}, turnRight: () => {} },
        pagination: { state$: pagination },
      } as unknown as Reader
      let loads = 0

      bridgeReader({
        bridge,
        containerElement: container,
        createReader: (manifest) =>
          loads++ === 0 ? previous : createTestReader(manifest),
      })

      load()

      expect(pagination.observed).toBe(true)
      expect(context.observed).toBe(true)

      load()

      expect(pagination.observed).toBe(false)
      expect(context.observed).toBe(false)
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
