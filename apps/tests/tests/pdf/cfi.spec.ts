import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSpineItemReady } from "../utils"

test.describe("Given headless rendering", () => {
  test("should return correct CFI", async ({ page }) => {
    await page.setViewportSize({
      width: 400,
      height: 600,
    })

    await page.goto("http://localhost:3333/tests/pdf/index.html")

    await waitForSpineItemReady(page, [0])

    const cfi = await page.evaluate(async () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const reader = (window as any).reader as Reader

      const spineItem = reader.spine.spineItemsManager.get(0)

      if (!spineItem) throw new Error("Spine item not found")

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const headlessRenderResult = await (window as any).lastValueFrom(
        spineItem.renderer.renderHeadless(),
      )

      if (!headlessRenderResult)
        throw new Error("Headless render result not found")

      const { doc, release } = headlessRenderResult

      // Simple function to find text node containing "Introduction"
      const findTextNode = (
        node: Node,
      ): { textNode: Text; offset: number } | null => {
        // If it's a text node, check if it contains "Introduction"
        if (node.nodeType === 3) {
          // Text node
          const textContent = node.textContent || ""
          const index = textContent.toLowerCase().indexOf("introduction")
          if (index >= 0) {
            return { textNode: node as Text, offset: index }
          }
        }

        // Recursively check child nodes
        for (const child of node.childNodes) {
          const result = findTextNode(child)
          if (result) return result
        }

        return null
      }

      const result = findTextNode(doc)

      if (!result) {
        throw new Error("Introduction text not found")
      }

      const { textNode, offset } = result

      // Create a range for the "Introduction" text
      const range = doc.createRange()
      range.setStart(textNode, offset)
      range.setEnd(textNode, offset + "introduction".length)

      const cfi = reader.cfi.generateCfiFromRange(range, spineItem.item)

      release?.()

      return cfi
    })

    expect(cfi).toBe("epubcfi(/6/2[0]!/4/14/1,:0,:12)")
  })
})
