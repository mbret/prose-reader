import { tap } from "rxjs"
import type { Reader } from "../../reader"
import { isHtmlTagElement } from "../../utils/dom"
import type { HtmlEnhancerOutput } from "../html/enhancer"

const resolveHref = (href: string, base: string) => {
  try {
    return new URL(href, base)
  } catch {
    return undefined
  }
}

/**
 * Follows the links clicked in the book's documents, through `goToUrl` like
 * any other url.
 */
export const handleLinksNavigation = (
  reader: Reader & HtmlEnhancerOutput,
  goToUrl: (url: URL) => void,
) =>
  reader.links$.pipe(
    tap((event) => {
      // The link listened to, rather than what was clicked inside it.
      const link = event.currentTarget

      if (!isHtmlTagElement(link, "a") || event.type !== "click") return

      const href = link.getAttribute("href")
      const spineItem = reader.spineItemsManager.items.find(
        (item) =>
          item.renderer.getDocumentFrame()?.contentDocument ===
          link.ownerDocument,
      )

      if (href === null || !spineItem) return

      // A document loaded from a blob cannot resolve a relative href on its
      // own, so it is resolved against its spine item's.
      const url = resolveHref(href, spineItem.item.href)

      if (url) goToUrl(url)
    }),
  )
