import type { Manifest } from "@prose-reader/shared"
import { combineLatest, merge, type Observable } from "rxjs"
import { switchMap, tap } from "rxjs/operators"
import { HTML_PREFIX as HTML_PREFIX_CORE } from "../../constants"
import type { Reader } from "../../reader"
import type { Viewport } from "../../viewport/Viewport"
import type { Theme } from "../theme"

export const HTML_PREFIX = `${HTML_PREFIX_CORE}-enhancer-loading`
export const CONTAINER_HTML_PREFIX = `${HTML_PREFIX}-container`

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
const defaultLoadingElementCreate = ({
  container,
  item,
  viewport,
}: {
  container: HTMLElement
  item: Manifest[`spineItems`][number]
  viewport: Viewport
}) => {
  const loadingElementContainer = container.ownerDocument.createElement(`div`)
  loadingElementContainer.classList.add(CONTAINER_HTML_PREFIX)
  loadingElementContainer.style.cssText = `
      height: 100%;
      width: 100%;
      max-width: ${viewport.absoluteViewport.width}px;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      position: absolute;
      left: 0;
      top: 0;
      color: rgb(202, 202, 202);
      background-color: white;
      z-index: 1;
    `

  const logoElement = loadingElementContainer.ownerDocument.createElement(`div`)
  logoElement.innerText = `prose`
  logoElement.style.cssText = `
      font-size: 4em;
    `
  const detailsElement =
    loadingElementContainer.ownerDocument.createElement(`div`)
  detailsElement.setAttribute(`data-details-element`, `true`)
  detailsElement.innerText = `loading ${item.id}`
  detailsElement.style.cssText = `
      font-size: 1.2em;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      max-width: 300px;
      width: 80%;
    `
  loadingElementContainer.appendChild(logoElement)
  loadingElementContainer.appendChild(detailsElement)

  return loadingElementContainer
}

export const createPlaceholderPages = (
  reader: Reader & { theme: { $: { theme$: Observable<Theme> } } },
) => {
  return reader.spineItemsManager.items$.pipe(
    switchMap((items) =>
      merge(
        ...items.map((item) => {
          // since we will use z-index for the loading element, we need to set the parent
          // to 0 to have it work as relative reference.
          item.containerElement.style.zIndex = `0`

          const alreadyExistingElement = item.containerElement.querySelector(
            `.${CONTAINER_HTML_PREFIX}`,
          )

          const loadingElementContainer =
            alreadyExistingElement instanceof HTMLElement
              ? alreadyExistingElement
              : defaultLoadingElementCreate({
                  container: item.containerElement,
                  item: item.item,
                  viewport: reader.viewport,
                })

          item.containerElement.appendChild(loadingElementContainer)

          return merge(
            item.pipe(
              tap((state) => {
                loadingElementContainer.style.setProperty(
                  `visibility`,
                  state.isReady ? `hidden` : `visible`,
                )
                loadingElementContainer.style.setProperty(
                  `z-index`,
                  state.isReady ? `0` : `1`,
                )

                if (state.isError) {
                  const detailsElement = loadingElementContainer.querySelector(
                    `[data-details-element]`,
                  )
                  if (detailsElement instanceof HTMLElement) {
                    detailsElement.innerText =
                      state.error?.toString() ?? `Unknown error`
                  }
                }
              }),
            ),
            combineLatest([reader.spine.layout$, reader.theme.$.theme$]).pipe(
              tap(([, theme]) => {
                const viewportWidth = reader.viewport.absoluteViewport.width

                loadingElementContainer.style.setProperty(
                  `max-width`,
                  `${viewportWidth}px`,
                )
                loadingElementContainer.style.setProperty(
                  `color`,
                  theme === `sepia` ? `#939393` : `rgb(202, 202, 202)`,
                )
              }),
            ),
          )
        }),
      ),
    ),
  )
}
