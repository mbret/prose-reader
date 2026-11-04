import { expect, test } from "@playwright/test"
import { waitForSettledOnCurrentLayout } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/** The second chapter, which fills the screen at the size below. */
const chapterSpineItemIndex = 11

/**
 * The page's window, as the page functions below fill it. They cast to it,
 * since the window's own type knows none of it.
 */
type ScenarioWindow = { isPointerOverFrame: boolean }

/**
 * Hidden under `display: none`, as in a tab or an `<Activity>`, a chapter's
 * frame measures 0 by 0. Chromium then sends the pointer over it
 * `pointerout` and `pointerleave`, which the reader copies for its root
 * element.
 */
test.describe("Given the pointer over a chapter's frame", () => {
  test.describe("when the reader's container is hidden", () => {
    test("should forward the pointer leaving the frame to the reader, at its position in the frame", async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== "chromium",
        "Firefox and WebKit send a frame they hide no pointer event, so there is nothing to forward",
      )

      const pageErrors: Error[] = []

      page.on("pageerror", (error) => {
        pageErrors.push(error)
      })

      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(
        `${url}?cfi=${encodeURIComponent(`epubcfi(/6/${(chapterSpineItemIndex + 1) * 2}!)`)}`,
      )
      await waitForSettledOnCurrentLayout(page)

      const reader = await getReader(page)

      await reader.evaluate((reader, spineItemIndex) => {
        const frameDocument = reader.spineItemsManager
          .get(spineItemIndex)
          ?.renderer.getDocumentFrame()?.contentDocument

        if (!frameDocument) throw new Error("the chapter has no document")

        Object.assign(window, { isPointerOverFrame: false })
        frameDocument.addEventListener(
          "pointerover",
          () => {
            Object.assign(window, { isPointerOverFrame: true })
          },
          { once: true },
        )
      }, chapterSpineItemIndex)

      const viewportSize = page.viewportSize()

      if (!viewportSize) throw new Error("the page has no viewport size")

      // Chromium can deliver a first move to the page rather than to the
      // frame under it, so the pointer moves until the frame reports it.
      let pointerMoves = 0

      await expect
        .poll(async () => {
          pointerMoves += 1
          await page.mouse.move(
            viewportSize.width / 2,
            viewportSize.height / 2 + pointerMoves,
          )

          return page.evaluate(
            () => (window as unknown as ScenarioWindow).isPointerOverFrame,
          )
        })
        .toBe(true)

      const leaves = await reader.evaluate(async (reader, spineItemIndex) => {
        const container = document.getElementById("app")
        const { rootElement } = reader.context.value
        const frameDocument = reader.spineItemsManager
          .get(spineItemIndex)
          ?.renderer.getDocumentFrame()?.contentDocument

        if (!container || !rootElement || !frameDocument) {
          throw new Error("the reader is not mounted on the chapter")
        }

        const forwardedLeaves: { clientX: number; clientY: number }[] = []

        rootElement.addEventListener("pointerleave", ({ clientX, clientY }) => {
          forwardedLeaves.push({ clientX, clientY })
        })

        /**
         * The reader listens to the frame's document from the moment it
         * loads, so this listener runs after the reader has forwarded the
         * event, or thrown. Chromium sends `pointerleave` in a rendering
         * update after the hide, so the page asks for animation frames until
         * it arrives.
         */
        const frameLeave = new Promise<{ clientX: number; clientY: number }>(
          (resolve) => {
            let hasPointerLeftFrame = false

            frameDocument.addEventListener(
              "pointerleave",
              ({ clientX, clientY }) => {
                hasPointerLeftFrame = true
                resolve({ clientX, clientY })
              },
              { once: true },
            )

            const renderNextFrame = () => {
              if (!hasPointerLeftFrame) requestAnimationFrame(renderNextFrame)
            }

            requestAnimationFrame(renderNextFrame)
          },
        )

        container.style.display = "none"

        return { frameLeave: await frameLeave, forwardedLeaves }
      }, chapterSpineItemIndex)

      expect(pageErrors).toEqual([])
      // The hidden frame has no size to scale the position by.
      expect(leaves.forwardedLeaves).toEqual([leaves.frameLeave])
    })
  })
})
