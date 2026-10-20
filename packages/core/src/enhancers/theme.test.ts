import { combineLatest, filter, firstValueFrom, timeout } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  holdItem,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
} from "../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"
import { CONTAINER_HTML_PREFIX as PLACEHOLDER_CLASS_NAME } from "./layout/createPlaceholderPages"
import type { Theme } from "./theme"

installReaderTestEnvironment()

const themeBackgroundColors: Record<Theme, string> = {
  bright: `white`,
  sepia: `#eaddc7`,
  night: `#191717`,
  publisher: `white`,
}

const getTestContainer = () => {
  const container = document.getElementById(`test-container`)

  if (!container) throw new Error(`installReaderTestEnvironment() did not run`)

  return container
}

const isPaintedBackground = (backgroundColor: string) =>
  backgroundColor !== `` &&
  backgroundColor !== `transparent` &&
  backgroundColor !== `rgba(0, 0, 0, 0)`

/**
 * Every background painted from `element` up to the reader's container, the
 * container included: what shows wherever the content does not cover it, as
 * when an item is loading or a page turn fades the content out.
 */
const getBackgroundsPaintedUpToContainer = (element: Element) => {
  const container = getTestContainer()
  const paintedBackgrounds = new Set<string>()
  let current: Element | null = element

  while (current) {
    const { backgroundColor } = getComputedStyle(current)

    if (isPaintedBackground(backgroundColor)) {
      paintedBackgrounds.add(backgroundColor)
    }

    current = current === container ? null : current.parentElement
  }

  return [...paintedBackgrounds]
}

const getLoadingPlaceholder = (
  reader: ReturnType<typeof createTestReader>,
  itemIndex: number,
) => {
  const placeholder = reader.spineItemsManager
    .get(itemIndex)
    ?.element.querySelector(`.${PLACEHOLDER_CLASS_NAME}`)

  if (!placeholder) throw new Error(`item ${itemIndex} has no placeholder`)

  return placeholder
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
  it("paints the reader and a loading item's placeholder with the theme's background", () => {
    const heldItem = holdItem(`/page_0.jpg`)
    const reader = createTestReader({
      getRenderer: heldItem.getRenderer,
      theme: `night`,
    })

    mountTestReader(reader)

    expect({
      containerBackground: getComputedStyle(getTestContainer()).backgroundColor,
      paintedBackgrounds: getBackgroundsPaintedUpToContainer(
        getLoadingPlaceholder(reader, 0),
      ),
    }).toEqual({
      containerBackground: themeBackgroundColors.night,
      paintedBackgrounds: [themeBackgroundColors.night],
    })
  })

  it("repaints the reader with each theme it switches to", () => {
    const heldItem = holdItem(`/page_0.jpg`)
    const reader = createTestReader({ getRenderer: heldItem.getRenderer })

    mountTestReader(reader)

    const themesInSwitchOrder: Theme[] = [
      `night`,
      `publisher`,
      `sepia`,
      `bright`,
    ]

    for (const theme of themesInSwitchOrder) {
      reader.theme.set(theme)

      expect({
        theme,
        paintedBackgrounds: getBackgroundsPaintedUpToContainer(
          getLoadingPlaceholder(reader, 0),
        ),
      }).toEqual({ theme, paintedBackgrounds: [themeBackgroundColors[theme]] })
    }
  })

  it("leaves nothing on the container once the reader is destroyed", () => {
    const container = getTestContainer()
    const reader = createTestReader({ theme: `night` })

    mountTestReader(reader)
    reader.destroy()

    expect(container.getAttribute(`style`) ?? ``).toBe(``)
  })

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
