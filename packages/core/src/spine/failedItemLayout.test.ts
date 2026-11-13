// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import type { DocumentRendererParams } from "../spineItem/renderer/DocumentRenderer"
import {
  createPrePaginatedManifest,
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
  TextDocumentRenderer,
} from "../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
  recordUnhandledErrors,
} from "../tests/utils"

installReaderTestEnvironment()

const failure = new Error("the layout failed")

class FailingLayoutRenderer extends TextDocumentRenderer {
  onLayout(): never {
    throw failure
  }
}

/** Fails where a spread reads it: in the item's layout, out of `onLayout`. */
class FailingRenditionLayoutRenderer extends TextDocumentRenderer {
  get renditionLayout(): never {
    throw failure
  }
}

describe("an item whose renderer fails to lay it out", () => {
  it("settles on it, leaves the items after it a place, and reports each failure", async () => {
    const unhandledErrors = recordUnhandledErrors()
    const reader = createTestReader({
      manifest: createPrePaginatedManifest({
        pageSpreads: [undefined, undefined, undefined],
      }),
      getRenderer: (item) => (props: DocumentRendererParams) =>
        item.index === 1
          ? new FailingLayoutRenderer(props)
          : new TextDocumentRenderer(props),
    })

    mountTestReader(reader)

    await expect(
      settledOn(reader, 0),
      "pagination settles on the first item",
    ).resolves.toBeDefined()

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    await expect(
      settledOn(reader, 1),
      "pagination settles on the item that fails",
    ).resolves.toBeDefined()

    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })

    await expect(
      settledOn(reader, 2),
      "pagination settles on the item after the one that fails",
    ).resolves.toBeDefined()
    await vi.waitFor(() => {
      expect(unhandledErrors).not.toHaveLength(0)
    })

    expect(unhandledErrors.filter((error) => error !== failure)).toEqual([])
  })
})

describe("an item whose layout fails outside its renderer", () => {
  it("settles on it, at every layout, and reports each failure", async () => {
    const unhandledErrors = recordUnhandledErrors()
    // Reflowable, so the layout of the item reads it for the spread.
    const reader = createTestReader({
      manifest: createTestManifest({
        spineItems: createTestManifestSpineItems(3),
      }),
      spreadMode: "always",
      getRenderer: (item) => (props: DocumentRendererParams) =>
        item.index === 1
          ? new FailingRenditionLayoutRenderer(props)
          : new TextDocumentRenderer(props),
    })

    mountTestReader(reader)

    await expect(
      settledOn(reader, 0),
      "pagination settles on the first item",
    ).resolves.toBeDefined()

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    await expect(
      settledOn(reader, 1),
      "pagination settles on the item that fails",
    ).resolves.toBeDefined()

    reader.layout()

    await expect(
      settledOn(reader, 1),
      "pagination settles on the item that fails, after a new layout",
    ).resolves.toBeDefined()
    await vi.waitFor(() => {
      expect(unhandledErrors).not.toHaveLength(0)
    })

    expect(unhandledErrors.filter((error) => error !== failure)).toEqual([])
  })
})
