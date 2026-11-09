import { delay, of } from "rxjs"
import { describe, expect, it } from "vitest"
import { DefaultRenderer } from "../spineItem/renderer/DefaultRenderer"
import type { DocumentRendererParams } from "../spineItem/renderer/DocumentRenderer"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"

installReaderTestEnvironment()

const numberOfItems = 2000

/** Items of one page each, as a comic or a PDF has one per page. */
const manifest = createPrePaginatedManifest({
  pageSpreads: Array.from({ length: numberOfItems }, () => undefined),
})

/** Lays its item out after a timer, as a renderer waiting on its document can. */
class LaterLayoutRenderer extends DefaultRenderer {
  onLayout() {
    return of(undefined).pipe(delay(0))
  }
}

describe(`Given a book of ${numberOfItems} one-page items`, () => {
  it.each([
    { renderers: "every item laid out at once", getRenderer: undefined },
    {
      renderers: "the first item laid out later, and the others at once",
      getRenderer: () => (props: DocumentRendererParams) =>
        props.item.index === 0
          ? new LaterLayoutRenderer(props)
          : new DefaultRenderer(props),
    },
  ])(
    "lays every item out and settles, with $renderers",
    async ({ getRenderer }) => {
      const reader = createTestReader({
        manifest,
        ...(getRenderer && { getRenderer }),
      })

      mountTestReader(reader)

      await settledOn(reader)

      expect(
        reader.spine.getSpineItemSpineLayoutInfo(numberOfItems - 1).left,
      ).toBe((numberOfItems - 1) * defaultTestViewport.width)
    },
  )
})
