import { combineLatest, filter, firstValueFrom, timeout } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
} from "../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"
import type { Theme } from "./theme"

installReaderTestEnvironment()

const themeBackgroundColors: Record<Theme, string> = {
  bright: `white`,
  sepia: `#eaddc7`,
  night: `#191717`,
  publisher: `white`,
}

const getDocumentBodyBackgroundColor = (
  reader: ReturnType<typeof createTestReader>,
  itemIndex: number,
) => {
  const frame = reader.spineItemsManager
    .get(itemIndex)
    ?.renderer.getDocumentFrame()
  const body = frame?.contentDocument?.body
  const frameWindow = frame?.contentWindow

  if (!body || !frameWindow) throw new Error(`item ${itemIndex} has no body`)

  return frameWindow.getComputedStyle(body).backgroundColor
}

const everyItemReady = (reader: ReturnType<typeof createTestReader>) =>
  firstValueFrom(
    combineLatest(
      reader.spineItemsManager.items.map((item) => item.isReady$),
    ).pipe(
      filter((readiness) => readiness.every(Boolean)),
      timeout(2000),
    ),
  )

describe("theme", () => {
  it("themes reflowable documents only, when they load and when the theme changes", async () => {
    const reader = createTestReader({
      getRenderer: renderTextDocuments,
      manifest: createTestManifest({
        spineItems: createTestManifestSpineItems([
          { renditionLayout: `reflowable` },
          { renditionLayout: `pre-paginated` },
        ]),
      }),
      theme: `sepia`,
    })

    mountTestReader(reader)
    await everyItemReady(reader)

    expect([
      getDocumentBodyBackgroundColor(reader, 0),
      getDocumentBodyBackgroundColor(reader, 1),
    ]).toEqual([themeBackgroundColors.sepia, ``])

    reader.theme.set(`night`)

    expect([
      getDocumentBodyBackgroundColor(reader, 0),
      getDocumentBodyBackgroundColor(reader, 1),
    ]).toEqual([themeBackgroundColors.night, ``])
  })
})
