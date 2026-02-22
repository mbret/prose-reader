import { describe, expect, it, vi } from "vitest"
import { SpinePosition } from "../../spine/types"
import { getNavigationForUrl } from "./getNavigationForUrl"

describe(`getNavigationForUrl`, () => {
  it(`should resolve navigation from spine item start when url has no hash`, () => {
    type NavigationParams = Parameters<typeof getNavigationForUrl>[0]

    const iframe = document.createElement(`iframe`)
    iframe.srcdoc = `<html><body><section id="chapter-1">Chapter 1</section></body></html>`
    document.body.appendChild(iframe)

    const contentDocument = iframe.contentDocument
    expect(contentDocument).toBeDefined()

    // biome-ignore lint/style/noNonNullAssertion: Expected to be defined
    const querySelectorSpy = vi.spyOn(contentDocument!, `querySelector`)
    const errorSpy = vi.spyOn(console, `error`).mockImplementation(() => {})
    const spineItem = {
      renderer: {
        getDocumentFrame: () => iframe,
      },
    }

    const result = getNavigationForUrl({
      url: `https://example.com/chapter-1.xhtml`,
      context: {
        manifest: {
          spineItems: [
            { id: `chapter-1`, href: `https://example.com/chapter-1.xhtml` },
          ],
        },
      } as NavigationParams[`context`],
      spineItemsManager: {
        get: vi.fn(() => spineItem),
      } as unknown as NavigationParams[`spineItemsManager`],
      spineLocator: {
        getSpinePositionFromSpineItemPosition: vi.fn(
          () => new SpinePosition({ x: 0, y: 0 }),
        ),
      } as unknown as NavigationParams[`spineLocator`],
      spine: {
        spineItemLocator: {
          getSpineItemPositionFromNode: vi.fn(),
        },
      } as unknown as NavigationParams[`spine`],
      pageSizeWidth: 100,
      visibleAreaRectWidth: 100,
    })

    expect(result).toMatchObject({
      spineItemId: `chapter-1`,
      position: { x: 0, y: 0 },
    })
    expect(querySelectorSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()

    querySelectorSpy.mockRestore()
    errorSpy.mockRestore()
    iframe.remove()
  })
})
