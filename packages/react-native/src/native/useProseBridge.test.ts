import { describe, expect, it, vi } from "vitest"
import { createProseBridge } from "./useProseBridge"

/**
 * `@webview-bridge/react-native` imports React Native, which cannot run under
 * vitest. This stands in for its store, the only part the native end of the
 * bridge uses, merging updates as the real one does: an `undefined` value is
 * dropped rather than stored, so it cannot clear a key.
 */
vi.mock("@webview-bridge/react-native", () => ({
  bridge: <T extends Record<string, unknown>>(
    procedures: (store: {
      get: () => T
      set: (state: Partial<T>) => void
    }) => T,
  ) => {
    // Empty only until `procedures` below returns the initial state, which
    // is the first thing done here: nothing reads it before then.
    let state = {} as T

    const setState = (newState: Partial<T>) => {
      state = {
        ...state,
        ...Object.fromEntries(
          Object.entries(newState).filter(([, value]) => value !== undefined),
        ),
      }
    }

    state = procedures({ get: () => state, set: setState })

    return { getState: () => state, setState }
  },
}))

const createBridge = () =>
  createProseBridge(async () => ({ data: "", headers: {} }))

const readerState = ({ appBridge }: ReturnType<typeof createBridge>) => {
  const { pagination, context, readingPosition } = appBridge.getState()

  return { pagination, context, readingPosition }
}

const noReaderState = { pagination: null, context: null, readingPosition: null }

describe("Given the native end of the bridge", () => {
  it("has no reader state before a book is loaded", () => {
    expect(readerState(createBridge())).toEqual(noReaderState)
  })

  it("keeps what the reader of the current load reports", () => {
    const proseBridge = createBridge()
    const load = proseBridge.startLoad()

    proseBridge.appBridge
      .getState()
      .report(load, { readingPosition: "epubcfi(/6/4[2]!)" })

    expect(readerState(proseBridge).readingPosition).toBe("epubcfi(/6/4[2]!)")
  })

  describe("when another book is loaded", () => {
    it("clears the previous book's state at once", () => {
      const proseBridge = createBridge()
      const load = proseBridge.startLoad()
      const { report } = proseBridge.appBridge.getState()

      report(load, { readingPosition: "epubcfi(/6/4[2]!)" })

      proseBridge.startLoad()

      expect(readerState(proseBridge)).toEqual(noReaderState)
    })

    /**
     * The web side stops relaying the previous reader once it receives the
     * new load, but whatever it sent before that is still crossing the
     * bridge, and lands after the native side started the new load.
     */
    it("drops what the previous book's reader reports afterwards", () => {
      const proseBridge = createBridge()
      const previousLoad = proseBridge.startLoad()
      const nextLoad = proseBridge.startLoad()
      const { report } = proseBridge.appBridge.getState()

      report(previousLoad, { readingPosition: "epubcfi(/6/4[2]!)" })

      expect(readerState(proseBridge)).toEqual(noReaderState)

      report(nextLoad, { readingPosition: "epubcfi(/6/2[1]!)" })

      expect(readerState(proseBridge).readingPosition).toBe("epubcfi(/6/2[1]!)")
    })
  })
})
