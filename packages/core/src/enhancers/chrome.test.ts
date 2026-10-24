import { describe, expect, it, vi } from "vitest"
import {
  createFullTestReader,
  getTestContainer,
  installReaderTestEnvironment,
  mountTestReader,
} from "../tests/readerHarness"

installReaderTestEnvironment()

describe("chrome", () => {
  it("scrolls the container back to its origin until the reader is destroyed", () => {
    const container = getTestContainer()
    const scrollContainerTo = vi.fn()
    container.scrollTo = scrollContainerTo
    const reader = createFullTestReader()

    mountTestReader(reader)
    container.dispatchEvent(new Event(`scroll`))
    reader.destroy()
    container.dispatchEvent(new Event(`scroll`))

    expect(scrollContainerTo.mock.calls).toEqual([[0, 0]])
  })
})
