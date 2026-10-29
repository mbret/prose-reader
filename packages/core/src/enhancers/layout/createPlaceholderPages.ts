import type { Manifest } from "@prose-reader/shared"
import { tap } from "rxjs"
import { HTML_PREFIX as HTML_PREFIX_CORE } from "../../constants"
import type { Reader } from "../../reader"
import {
  isHtmlElement,
  setPropertyIfChanged,
  setStylePropertyIfChanged,
} from "../../utils/dom"

export const HTML_PREFIX = `${HTML_PREFIX_CORE}-enhancer-loading`
export const CONTAINER_HTML_PREFIX = `${HTML_PREFIX}-container`
export const LOGO_HTML_PREFIX = `${HTML_PREFIX}-logo`
export const DETAILS_HTML_PREFIX = `${HTML_PREFIX}-details`

const defaultLoadingElementCreate = ({
  container,
  item,
}: {
  container: HTMLElement
  item: Manifest[`spineItems`][number]
}) => {
  const loadingElementContainer = container.ownerDocument.createElement(`div`)
  loadingElementContainer.classList.add(CONTAINER_HTML_PREFIX)

  const logoElement = loadingElementContainer.ownerDocument.createElement(`div`)
  logoElement.classList.add(LOGO_HTML_PREFIX)
  logoElement.innerText = `prose`
  const detailsElement =
    loadingElementContainer.ownerDocument.createElement(`div`)
  detailsElement.classList.add(DETAILS_HTML_PREFIX)
  detailsElement.setAttribute(`data-details-element`, `true`)
  detailsElement.innerText = `loading ${item.id}`
  loadingElementContainer.appendChild(logoElement)
  loadingElementContainer.appendChild(detailsElement)

  return loadingElementContainer
}

export const createPlaceholderPages = (reader: Reader) => {
  const loadingElements = new WeakMap<HTMLElement, HTMLElement>()

  reader.hookManager.register(
    `item.onBeforeContainerAttach`,
    ({ element, item }) => {
      // since we will use z-index for the loading element, we need to set the parent
      // to 0 to have it work as relative reference.
      setStylePropertyIfChanged(element.style, `z-index`, `0`)

      const loadingElement = defaultLoadingElementCreate({
        container: element,
        item,
      })

      loadingElements.set(element, loadingElement)
      element.appendChild(loadingElement)
    },
  )

  /**
   * The placeholder says why the item's load failed while it is in error,
   * and that it loads otherwise, such as once it loads again. It is written
   * from the item's state at each change of its load status.
   */
  return reader.spineItemsObserver.itemLoadStatusChange$.pipe(
    tap(({ item }) => {
      const detailsElement = loadingElements
        .get(item.containerElement)
        ?.querySelector(`[data-details-element]`)

      if (!isHtmlElement(detailsElement)) return

      const { loadStatus, loadError } = item.value

      // `textContent`, not `innerText`: reading it lays nothing out.
      setPropertyIfChanged(
        detailsElement,
        `textContent`,
        loadStatus === "error"
          ? (loadError?.toString() ?? `Unknown error`)
          : `loading ${item.item.id}`,
      )
    }),
  )
}
