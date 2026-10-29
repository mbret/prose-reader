import { combineLatest, filter, firstValueFrom, timeout } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  getTestContainer,
  holdItem,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
} from "../../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"
import { CONTAINER_HTML_PREFIX as PLACEHOLDER_CLASS_NAME } from "../layout/createPlaceholderPages"
import { getThemeBackgroundColor } from "./theme"
import type { Theme } from "./types"

installReaderTestEnvironment()

const themeBackgroundColors: Record<Theme, string> = {
  bright: `white`,
  sepia: `#eaddc7`,
  night: `#191717`,
  publisher: `white`,
}

const isPaintedBackground = (backgroundColor: string) =>
  backgroundColor !== `` &&
  backgroundColor !== `transparent` &&
  backgroundColor !== `rgba(0, 0, 0, 0)`

/**
 * The background colors painted from `element` up to the reader's container,
 * the container included, each once: what shows wherever the content does not
 * cover it, as when an item is loading or a page turn fades the content out.
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

const getDocumentBodyPaintedBackground = (
  reader: ReturnType<typeof createTestReader>,
  itemIndex: number,
) => {
  const frame = reader.spineItemsManager
    .get(itemIndex)
    ?.renderer.getDocumentFrame()
  const body = frame?.contentDocument?.body
  const frameWindow = frame?.contentWindow

  if (!body || !frameWindow) throw new Error(`item ${itemIndex} has no body`)

  const { backgroundColor } = frameWindow.getComputedStyle(body)

  return isPaintedBackground(backgroundColor) ? backgroundColor : undefined
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
      reader.settings.update({ theme })

      expect({
        theme,
        paintedBackgrounds: getBackgroundsPaintedUpToContainer(
          getLoadingPlaceholder(reader, 0),
        ),
      }).toEqual({ theme, paintedBackgrounds: [themeBackgroundColors[theme]] })
    }
  })

  it("colors a loading item's placeholder text for the theme it is created with, and for a new one", () => {
    const heldItem = holdItem(`/page_0.jpg`)
    const reader = createTestReader({
      getRenderer: heldItem.getRenderer,
      theme: `sepia`,
    })

    mountTestReader(reader)

    const textColorAtCreation = getComputedStyle(
      getLoadingPlaceholder(reader, 0),
    ).color

    reader.settings.update({ theme: `night` })

    expect({
      textColorAtCreation,
      textColorAfterNight: getComputedStyle(getLoadingPlaceholder(reader, 0))
        .color,
    }).toEqual({
      textColorAtCreation: `#939393`,
      textColorAfterNight: `rgb(202, 202, 202)`,
    })
  })

  it("getThemeBackgroundColor gives the background the reader paints with each theme", () => {
    const reader = createTestReader()
    const themes: Theme[] = [`bright`, `sepia`, `night`, `publisher`]

    mountTestReader(reader)

    for (const theme of themes) {
      reader.settings.update({ theme })

      expect({ theme, background: getThemeBackgroundColor(theme) }).toEqual({
        theme,
        background: getComputedStyle(getTestContainer()).backgroundColor,
      })
    }
  })

  it("leaves no inline style on the container once destroyed", () => {
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
      getDocumentBodyPaintedBackground(reader, 0),
      getDocumentBodyPaintedBackground(reader, 1),
    ]).toEqual([themeBackgroundColors.sepia, undefined])

    reader.settings.update({ theme: `night` })

    expect([
      getDocumentBodyPaintedBackground(reader, 0),
      getDocumentBodyPaintedBackground(reader, 1),
    ]).toEqual([themeBackgroundColors.night, undefined])

    reader.settings.update({ theme: `publisher` })

    expect([
      getDocumentBodyPaintedBackground(reader, 0),
      getDocumentBodyPaintedBackground(reader, 1),
    ]).toEqual([undefined, undefined])
  })
})
