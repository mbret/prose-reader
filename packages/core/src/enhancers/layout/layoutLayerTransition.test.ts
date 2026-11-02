import { filter, firstValueFrom, timeout } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
} from "../../tests/readerHarness"

installReaderTestEnvironment()

describe("layoutLayerTransition", () => {
  it.each([
    { layoutLayerTransition: true, documentTransition: `opacity 800ms` },
    { layoutLayerTransition: false, documentTransition: `` },
  ])(
    "fades a document in only when it is on ($layoutLayerTransition)",
    async ({ layoutLayerTransition, documentTransition }) => {
      const reader = createTestReader({
        getRenderer: renderTextDocuments,
        layoutLayerTransition,
      })

      mountTestReader(reader)

      const [firstItem] = reader.spineItemsManager.items

      if (!firstItem) throw new Error(`the reader has no item`)

      await firstValueFrom(
        firstItem.isReady$.pipe(filter(Boolean), timeout(2000)),
      )

      expect(firstItem.renderer.documentContainer?.style.transition).toBe(
        documentTransition,
      )
    },
  )
})
