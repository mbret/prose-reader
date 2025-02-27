import { tap } from "rxjs"
import type { Reader } from "../../reader"
import { isHtmlTagElement } from "../../utils/dom"
import type { HtmlEnhancerOutput } from "../html/enhancer"
import type { ManualNavigator } from "./navigators/manualNavigator"

export const handleLinksNavigation = (
  reader: Reader & HtmlEnhancerOutput,
  manualNavigator: ManualNavigator,
) => {
  return reader.links$.pipe(
    tap((event) => {
      if (!isHtmlTagElement(event.target, "a") || event.type !== "click") return

      const hrefUrl = new URL(event.target.href)
      const hrefWithoutAnchor = `${hrefUrl.origin}${hrefUrl.pathname}`

      // internal link, we can handle
      const hasExistingSpineItem = reader.context.manifest?.spineItems.some(
        (item) => item.href === hrefWithoutAnchor,
      )

      if (hasExistingSpineItem) {
        manualNavigator.goToUrl(hrefUrl)
      }
    }),
  )
}
