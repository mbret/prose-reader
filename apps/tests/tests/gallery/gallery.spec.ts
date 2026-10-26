import { expect, type Page, test } from "@playwright/test"
import type { Theme } from "@prose-reader/core"
import { waitForSpineItemReady } from "../utils"
import { getReader } from "../utils/reader"

const TRANSPARENT_BACKGROUND = "rgba(0, 0, 0, 0)"
const DEFAULT_THEME_BACKGROUND = "rgb(255, 255, 255)"

async function loadGalleryReader(page: Page) {
  await page.setViewportSize({
    width: 900,
    height: 720,
  })

  await page.goto("http://localhost:3333/tests/gallery/index.html")

  await waitForSpineItemReady(page, [0])
}

async function openGallery(page: Page) {
  await page.getByRole("button", { name: "Open gallery" }).click()

  await expect(page.locator("#gallery [data-gallery-cell] iframe")).toHaveCount(
    6,
  )
}

test("should render comic thumbnails in the gallery", async ({ page }) => {
  await loadGalleryReader(page)
  await openGallery(page)

  const gallery = page.locator("#gallery")

  await expect(gallery).toBeVisible()
  await expect(page.locator("[data-gallery-cell]")).toHaveCount(6)

  await expect(gallery).toHaveScreenshot("comic-gallery-thumbnails.png", {
    maxDiffPixelRatio: 0.01,
  })
})

test("should show each thumbnail's page on the reader's current theme", async ({
  page,
}) => {
  const themesSetBeforeOpening: Theme[] = ["night", "sepia"]

  for (const theme of themesSetBeforeOpening) {
    await loadGalleryReader(page)

    const reader = await getReader(page)

    await reader.evaluate((reader, theme) => {
      reader.settings.update({ theme })
    }, theme)

    const readerBackground = await page
      .locator("#app")
      .evaluate((container) => getComputedStyle(container).backgroundColor)

    expect(readerBackground).not.toBe(DEFAULT_THEME_BACKGROUND)

    await openGallery(page)

    const backgroundsBehindPages = await page
      .locator("#gallery [data-gallery-cell] iframe")
      .evaluateAll((frames, transparentBackground) => {
        const getFirstPaintedBackground = (element: Element | null) => {
          let current = element

          while (
            current &&
            getComputedStyle(current).backgroundColor === transparentBackground
          ) {
            current = current.parentElement
          }

          return current ? getComputedStyle(current).backgroundColor : undefined
        }

        return frames.map((frame) =>
          getFirstPaintedBackground(frame.parentElement),
        )
      }, TRANSPARENT_BACKGROUND)

    expect({ theme, backgroundsBehindPages }).toEqual({
      theme,
      backgroundsBehindPages: Array(6).fill(readerBackground),
    })
  }
})
