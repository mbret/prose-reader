import { tap } from "rxjs"
import type { Reader } from "../../reader"
import { isHtmlTagElement } from "../../utils/dom"
import type { HtmlEnhancerOutput } from "../html/enhancer"
import { getUrlSelector } from "./getUrlSelector"

/** Follows the links between the book's documents. */
export const handleLinksNavigation = (reader: Reader & HtmlEnhancerOutput) =>
  reader.links$.pipe(
    tap((event) => {
      // The link listened to, rather than what was clicked inside it.
      const link = event.currentTarget

      if (!isHtmlTagElement(link, "a") || event.type !== "click") return

      const href = link.getAttribute("href")
      // A document loaded from a blob cannot resolve a relative href on its
      // own, so it is resolved against its spine item's.
      const spineItem = reader.spineItemsManager.items.find(
        (item) =>
          item.renderer.getDocumentFrame()?.contentDocument ===
          link.ownerDocument,
      )

      if (!href || !spineItem) return

      const selector = getUrlSelector(
        href,
        reader.context.manifest,
        spineItem.item.href,
      )

      if (selector) {
        reader.navigation.navigate({ target: selector, animation: false })
      }
    }),
  )
