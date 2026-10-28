import { describe, expect, it, vi } from "vitest"
import {
  createFullTestReader,
  getTestContainer,
  installReaderTestEnvironment,
  mountTestReader,
} from "./tests/readerHarness"

installReaderTestEnvironment()

describe("Given a reader with every core enhancer", () => {
  it("leaves the container it was mounted into as it found it once destroyed", () => {
    const container = getTestContainer()
    container.classList.add("app-container")
    container.style.color = "red"
    container.setAttribute("data-app", "")
    const containerBeforeMount = container.outerHTML
    const addEventListener = vi.spyOn(container, "addEventListener")
    const removeEventListener = vi.spyOn(container, "removeEventListener")
    const reader = createFullTestReader()

    // A consumer still subscribed when the reader is destroyed.
    reader.selection.lastSelectionOnPointerdown$.subscribe()

    mountTestReader(reader)
    reader.destroy()

    const addedListeners = addEventListener.mock.calls.map(
      ([type, listener]) => ({ type, listener }),
    )
    const removedListeners = removeEventListener.mock.calls.map(
      ([type, listener]) => ({ type, listener }),
    )

    expect(addedListeners).not.toEqual([])
    expect(removedListeners).toEqual(expect.arrayContaining(addedListeners))
    expect(container.outerHTML).toBe(containerBeforeMount)
  })
})
