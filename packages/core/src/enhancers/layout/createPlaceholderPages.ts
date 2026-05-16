import type { Manifest } from "@prose-reader/shared"
import { merge } from "rxjs"
import { tap } from "rxjs/operators"
import { HTML_PREFIX as HTML_PREFIX_CORE } from "../../constants"
import type { Reader } from "../../reader"
import {
  setPropertyIfChanged,
  setStylePropertyIfChanged,
} from "../../utils/dom"
import type { Theme, ThemeEnhancerOutput } from "../theme"

export const HTML_PREFIX = `${HTML_PREFIX_CORE}-enhancer-loading`
export const CONTAINER_HTML_PREFIX = `${HTML_PREFIX}-container`
export const LOGO_HTML_PREFIX = `${HTML_PREFIX}-logo`
export const DETAILS_HTML_PREFIX = `${HTML_PREFIX}-details`

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
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

const getLoadingElementColor = (theme: Theme) => {
  return theme === `sepia` ? `#939393` : `rgb(202, 202, 202)`
}

const applyLoadingElementTheme = ({
  loadingElement,
  theme,
}: {
  loadingElement: HTMLElement
  theme: Theme
}) => {
  setStylePropertyIfChanged(
    loadingElement.style,
    `color`,
    getLoadingElementColor(theme),
  )
}

export const createPlaceholderPages = (
  reader: Reader & {
    theme: ThemeEnhancerOutput
  },
) => {
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

      applyLoadingElementTheme({
        loadingElement,
        theme: reader.theme.get(),
      })

      loadingElements.set(element, loadingElement)
      element.appendChild(loadingElement)
    },
  )

  const itemError$ = reader.spineItemsObserver.states$.pipe(
    tap(({ item, isError, error }) => {
      if (!isError) return

      const loadingElementContainer = loadingElements.get(item.containerElement)

      if (!loadingElementContainer) return

      const detailsElement = loadingElementContainer.querySelector(
        `[data-details-element]`,
      )
      if (detailsElement instanceof HTMLElement) {
        setPropertyIfChanged(
          detailsElement,
          `innerText`,
          error?.toString() ?? `Unknown error`,
        )
      }
    }),
  )

  const theme$ = reader.theme.$.theme$.pipe(
    tap((theme) => {
      for (const item of reader.spineItemsManager.items) {
        const loadingElement = loadingElements.get(item.containerElement)

        if (loadingElement) {
          applyLoadingElementTheme({
            loadingElement,
            theme,
          })
        }
      }
    }),
  )

  return merge(itemError$, theme$)
}
