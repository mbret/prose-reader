// @vitest-environment jsdom
import { mergeMap, throwError, timer } from "rxjs"
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
import { recordUnhandledErrors } from "../tests/utils"

installReaderTestEnvironment()

const failure = new Error("the layout failed")

describe("an item whose layout fails", () => {
  it.each([
    {
      failure: "throws as it starts",
      layOut: () => {
        throw failure
      },
    },
    {
      failure: "fails later",
      layOut: () => timer(0).pipe(mergeMap(() => throwError(() => failure))),
    },
  ])(
    "leaves the items after it a place, on which pagination settles, when its renderer $failure",
    async ({ layOut }) => {
      const unhandledErrors = recordUnhandledErrors()

      class FailingLayoutRenderer extends TextDocumentRenderer {
        onLayout() {
          return layOut()
        }
      }

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

      reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })

      await expect(
        settledOn(reader, 2),
        "pagination settles on the item after the one that fails",
      ).resolves.toBeDefined()
      await vi.waitFor(() => {
        expect(new Set(unhandledErrors)).toEqual(new Set([failure]))
      })
    },
  )
})
